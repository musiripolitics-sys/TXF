import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { membershipOrderSchema, firstError } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = membershipOrderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
    }
    const { tier } = parsed.data;

    // Price always comes from the DB so pricing changes never need a deploy
    // and the page and the charge can't diverge.
    const supabase = await createClient();
    const { data: plan } = await supabase
      .from("membership_plans")
      .select("price_amount")
      .eq("tier", tier)
      .maybeSingle();
    if (!plan?.price_amount || plan.price_amount <= 0) {
      return NextResponse.json({ error: "Membership plan not available" }, { status: 400 });
    }
    const amount = plan.price_amount;

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.error("Razorpay keys are missing from environment variables.");
      return NextResponse.json(
        { error: "Payment gateway is not configured" },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `membership_${user.id}_${Date.now().toString().slice(-6)}`,
      notes: {
        kind: "membership",
        userId: user.id,
        tier,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: key_id,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
