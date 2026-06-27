import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendRegistrationConfirmation, sendPaymentReceipt } from "@/lib/email";
import { getActiveTier, applyMemberDiscount } from "@/lib/membership";
import { ticketVerifySchema, firstError } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = ticketVerifySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
    }
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      eventId,
      attendee_name,
      attendee_email,
      attendee_phone,
    } = parsed.data;

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return NextResponse.json(
        { error: "Payment verification key is not configured" },
        { status: 500 },
      );
    }

    // Verify signature: hmac_sha256(order_id + "|" + payment_id, key_secret)
    const generated_signature = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const supabase = await createClient();

    // Re-read the price from the DB (don't trust the client).
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, title, date_label, venue, price_amount, currency")
      .eq("id", eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Recompute the member-discounted amount the same way the order did.
    const tier = await getActiveTier(supabase, user.id);
    const finalAmount = applyMemberDiscount(event.price_amount, tier);

    // 1. Log the payment (idempotent on provider_ref).
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        stream: "ticket_sales",
        amount: finalAmount,
        currency: event.currency || "INR",
        status: "paid",
        provider: "razorpay",
        provider_ref: razorpay_payment_id,
        related_type: "events",
        related_id: event.id,
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
      console.error("Failed to insert ticket payment:", paymentError);
      return NextResponse.json(
        { error: "Signature verified, but failed to log the payment" },
        { status: 500 },
      );
    }

    // 2. Register + decrement capacity atomically, linking the payment.
    const { data: ticketCode, error: regError } = await supabase.rpc(
      "register_for_event",
      {
        p_event_id: eventId,
        p_attendee_name: attendee_name,
        p_attendee_email: attendee_email,
        p_attendee_phone: attendee_phone ?? null,
        p_payment_id: payment.id,
      },
    );

    if (regError) {
      const msg = regError.message ?? "";
      // Payment succeeded but registration didn't — surface clearly so it can be reconciled/refunded.
      if (msg.includes("ALREADY_REGISTERED")) {
        return NextResponse.json(
          { error: "You're already registered. Your payment was recorded — contact support for a refund." },
          { status: 409 },
        );
      }
      if (msg.includes("EVENT_FULL")) {
        return NextResponse.json(
          { error: "This event filled up. Your payment was recorded — contact support for a refund." },
          { status: 409 },
        );
      }
      console.error("Ticket registration after payment failed:", regError);
      return NextResponse.json(
        { error: "Payment logged, but registration failed. Contact support." },
        { status: 500 },
      );
    }

    // Best-effort emails (never block the success response).
    await Promise.all([
      sendRegistrationConfirmation({
        to: attendee_email,
        name: attendee_name,
        eventTitle: event.title ?? "your event",
        ticketCode: ticketCode as string,
        dateLabel: event.date_label,
        venue: event.venue,
      }),
      sendPaymentReceipt({
        to: attendee_email,
        name: attendee_name,
        description: `Ticket — ${event.title ?? "Event"}${tier ? ` (${tier} member price)` : ""}`,
        amount: finalAmount,
        currency: event.currency || "INR",
        paymentRef: razorpay_payment_id,
      }),
    ]);

    return NextResponse.json({ success: true, ticketCode });
  } catch (error: any) {
    console.error("Ticket payment verification failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify payment" },
      { status: 500 },
    );
  }
}
