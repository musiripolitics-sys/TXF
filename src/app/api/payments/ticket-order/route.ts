import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveTier, applyMemberDiscount } from "@/lib/membership";
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
    const { eventId } = parsed.data;

    const supabase = await createClient();
    const { data: event, error } = await supabase
      .from("events")
      .select("id, title, price_amount, currency, status, spots_left")
      .eq("id", eventId)
      .maybeSingle();

    if (error || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.status !== "published") {
      return NextResponse.json({ error: "Registration isn't open" }, { status: 400 });
    }
    if (event.spots_left <= 0) {
      return NextResponse.json({ error: "This event is full" }, { status: 400 });
    }
    // Amount comes from the DB, never the client.
    if (!event.price_amount || event.price_amount <= 0) {
      return NextResponse.json({ error: "This is a free event" }, { status: 400 });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      console.error("Razorpay keys are missing from environment variables.");
      return NextResponse.json(
        { error: "Payment gateway is not configured" },
        { status: 500 },
      );
    }

    // Member discount (Pro/Elite) — computed server-side from the DB.
    const tier = await getActiveTier(supabase, user.id);
    const finalAmount = applyMemberDiscount(event.price_amount, tier);

    const razorpay = new Razorpay({ key_id, key_secret });
    const order = await razorpay.orders.create({
      amount: finalAmount,
      currency: event.currency || "INR",
      receipt: `ticket_${event.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
      notes: { userId: user.id, eventId: event.id },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
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
