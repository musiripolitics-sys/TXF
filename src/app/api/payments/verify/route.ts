import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendPaymentReceipt } from "@/lib/email";
import { membershipVerifySchema, firstError } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = membershipVerifySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
    }
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, tier } =
      parsed.data;

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return NextResponse.json(
        { error: "Payment verification key is not configured" },
        { status: 500 }
      );
    }

    // Verify signature: hmac = hmac_sha256(order_id + "|" + payment_id, key_secret)
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac("sha256", key_secret)
      .update(text)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // Connect to Supabase
    const supabase = await createClient();

    // 1. Fetch the plan ID of the tier
    const { data: plan, error: planError } = await supabase
      .from("membership_plans")
      .select("id")
      .eq("tier", tier)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json(
        { error: `Membership plan for tier ${tier} not found in database` },
        { status: 500 }
      );
    }

    const amount = tier === "Pro" ? 49900 : 149900;

    // 2. Insert into payments table
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: user.id,
      stream: "membership",
      amount,
      currency: "INR",
      status: "paid",
      provider: "razorpay",
      provider_ref: razorpay_payment_id,
      related_type: "membership_plans",
      related_id: plan.id,
    });

    if (paymentError) {
      console.error("Failed to insert payment record:", paymentError);
      return NextResponse.json(
        { error: "Signature verified, but failed to log payment in database" },
        { status: 500 }
      );
    }

    // 3. Upsert into memberships table
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const renewsAt = new Date();
    renewsAt.setDate(renewsAt.getDate() + 30); // 30 days membership period

    let membershipError;
    if (existingMembership) {
      const { error } = await supabase
        .from("memberships")
        .update({
          plan_id: plan.id,
          tier,
          status: "active",
          started_at: new Date().toISOString(),
          renews_at: renewsAt.toISOString(),
          cancelled_at: null,
          payment_provider_ref: razorpay_payment_id,
        })
        .eq("user_id", user.id);
      membershipError = error;
    } else {
      const { error } = await supabase.from("memberships").insert({
        user_id: user.id,
        plan_id: plan.id,
        tier,
        status: "active",
        started_at: new Date().toISOString(),
        renews_at: renewsAt.toISOString(),
        payment_provider_ref: razorpay_payment_id,
      });
      membershipError = error;
    }

    if (membershipError) {
      console.error("Failed to update membership record:", membershipError);
      return NextResponse.json(
        { error: "Payment logged, but failed to activate membership role in database" },
        { status: 500 }
      );
    }

    // Elite members are listed in the member directory by default (they can
    // still opt out later from profile settings).
    if (tier === "Elite") {
      await supabase.from("users").update({ discoverable: true }).eq("id", user.id);
    }

    // Best-effort receipt (never blocks the success response).
    if (user.email) {
      await sendPaymentReceipt({
        to: user.email,
        name: (user.user_metadata?.full_name as string) || "there",
        description: `${tier} membership`,
        amount,
        currency: "INR",
        paymentRef: razorpay_payment_id,
      });
    }

    return NextResponse.json({ success: true, tier });
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
