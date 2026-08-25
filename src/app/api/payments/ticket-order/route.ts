import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ticketOrderSchema, firstError } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = ticketOrderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
    }
    const {
      eventId,
      ticketTypeId,
      quantity = 1,
      promoCode,
      attendee_name,
      attendee_email,
      attendee_phone,
    } = parsed.data;

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      console.error("Razorpay keys are missing from environment variables.");
      return NextResponse.json(
        { error: "Payment gateway is not configured" },
        { status: 500 },
      );
    }

    const supabase = await createClient();

    // If the client didn't pick a tier, use the event's default (cheapest) one.
    let tierId = ticketTypeId;
    if (!tierId) {
      const { data: t } = await supabase
        .from("ticket_types")
        .select("id")
        .eq("event_id", eventId)
        .eq("is_hidden", false)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      tierId = t?.id;
      if (!tierId) {
        return NextResponse.json({ error: "No tickets available" }, { status: 400 });
      }
    }

    // create_pending_order does the pricing (tier price × qty, member/promo
    // discount) AND holds the seats, all server-side and atomically.
    const { data: pending, error: orderError } = await supabase.rpc(
      "create_pending_order",
      {
        p_event_id: eventId,
        p_ticket_type_id: tierId,
        p_quantity: quantity,
        p_buyer_name: attendee_name,
        p_buyer_email: attendee_email,
        p_buyer_phone: attendee_phone ?? null,
        p_promo_code: promoCode ?? null,
        p_user_id: user.id,
      },
    );

    if (orderError || !pending) {
      const msg = orderError?.message ?? "";
      const friendly = msg.includes("NOT_ENOUGH_SEATS")
        ? "There aren't enough seats left for that quantity."
        : msg.includes("INVALID_PROMO")
          ? "Invalid or expired promo code"
          : msg.includes("SALES_ENDED")
            ? "Sales for this ticket have closed."
            : msg.includes("SALES_NOT_STARTED")
              ? "Sales for this ticket haven't opened yet."
              : msg.includes("EVENT_OVER")
                ? "This event has already taken place."
                : msg.includes("MAX_QTY")
                  ? "That's more tickets than allowed per order."
                  : "Couldn't start checkout. Please try again.";
      return NextResponse.json({ error: friendly }, { status: 400 });
    }

    const { order_id, total, subtotal, discount, currency } = pending as {
      order_id: string;
      total: number;
      subtotal: number;
      discount: number;
      currency: string;
    };

    // A fully-discounted order needs no payment — fulfil it immediately.
    if (total <= 0) {
      const { data: done, error: fulfilError } = await supabase.rpc("fulfil_order", {
        p_order_id: order_id,
        p_payment_id: null,
      });
      if (fulfilError) {
        return NextResponse.json(
          { error: "Couldn't issue your tickets. Please try again." },
          { status: 500 },
        );
      }
      return NextResponse.json({
        free: true,
        tickets: (done as { tickets?: string[] })?.tickets ?? [],
      });
    }

    const razorpay = new Razorpay({ key_id, key_secret });
    const order = await razorpay.orders.create({
      amount: total,
      currency: currency || "INR",
      receipt: `txf_${order_id.slice(0, 18)}`,
      // Everything the webhook needs to fulfil without the browser.
      notes: { kind: "ticket", orderId: order_id, userId: user.id, eventId },
    });

    return NextResponse.json({
      orderId: order.id,
      txfOrderId: order_id,
      amount: order.amount,
      currency: order.currency,
      subtotal,
      discount,
      keyId: key_id,
    });
  } catch (error: any) {
    console.error("Error creating ticket order:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create payment order" },
      { status: 500 },
    );
  }
}
