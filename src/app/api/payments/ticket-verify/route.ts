import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendRegistrationConfirmation, sendPaymentReceipt } from "@/lib/email";
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
      txfOrderId,
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

    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, title, date_label, venue, currency")
      .eq("id", eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // The pending order is the source of truth for what was charged — it was
    // priced server-side at checkout and already holds the seats.
    let orderQuery = supabase
      .from("orders")
      .select("id, total, quantity, currency, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id);
    orderQuery = txfOrderId
      ? orderQuery.eq("id", txfOrderId)
      : orderQuery.eq("status", "pending").order("created_at", { ascending: false }).limit(1);

    const { data: order } = await orderQuery.maybeSingle();
    if (!order) {
      return NextResponse.json(
        { error: "Checkout session not found. Please start again." },
        { status: 404 },
      );
    }
    const finalAmount = order.total;

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

    // 2. Issue the tickets held by the order (idempotent, links the payment).
    const { data: fulfilled, error: regError } = await supabase.rpc("fulfil_order", {
      p_order_id: order.id,
      p_payment_id: payment.id,
    });
    const ticketCodes = (fulfilled as { tickets?: string[] })?.tickets ?? [];
    const ticketCode = ticketCodes[0];

    if (regError) {
      const msg = regError.message ?? "";

      // Payment succeeded but no seat could be granted — refund automatically
      // instead of stranding the buyer's money.
      let refunded = false;
      try {
        const Razorpay = (await import("razorpay")).default;
        const rzp = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID!,
          key_secret,
        });
        await rzp.payments.refund(razorpay_payment_id, { amount: finalAmount });
        await supabase
          .from("payments")
          .update({ status: "refunded" })
          .eq("id", payment.id);
        refunded = true;
      } catch (refundErr) {
        console.error("Auto-refund failed:", refundErr);
      }

      const tail = refunded
        ? "Your payment has been refunded automatically."
        : "Your payment was recorded — contact support for a refund.";
      if (msg.includes("ALREADY_REGISTERED")) {
        return NextResponse.json(
          { error: `You're already registered. ${tail}` },
          { status: 409 },
        );
      }
      if (msg.includes("EVENT_FULL")) {
        return NextResponse.json(
          { error: `This event filled up. ${tail}` },
          { status: 409 },
        );
      }
      if (msg.includes("EVENT_OVER")) {
        return NextResponse.json(
          { error: `This event has already taken place. ${tail}` },
          { status: 409 },
        );
      }
      console.error("Ticket registration after payment failed:", regError);
      return NextResponse.json(
        { error: `Registration failed. ${tail}` },
        { status: 500 },
      );
    }

    // (fulfil_order redeems the promo itself, so there's nothing to do here.)

    // Best-effort emails (never block the success response).
    const qty = order.quantity ?? 1;
    await Promise.all([
      sendRegistrationConfirmation({
        to: attendee_email,
        name: attendee_name,
        eventTitle: event.title ?? "your event",
        ticketCode: ticketCode as string,
        dateLabel: event.date_label,
        venue: event.venue,
        extraTickets: ticketCodes.length > 1 ? ticketCodes.slice(1) : undefined,
      }),
      sendPaymentReceipt({
        to: attendee_email,
        name: attendee_name,
        description: `${qty} × Ticket — ${event.title ?? "Event"}`,
        amount: finalAmount,
        currency: order.currency || event.currency || "INR",
        paymentRef: razorpay_payment_id,
      }),
    ]);

    return NextResponse.json({ success: true, ticketCode, ticketCodes });
  } catch (error: any) {
    console.error("Ticket payment verification failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify payment" },
      { status: 500 },
    );
  }
}
