import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook — the source of truth for captured payments. If the buyer's
 * browser dies between paying and calling verify, this still fulfils the
 * purchase (ticket or membership). Idempotent with the verify routes via the
 * unique (provider, provider_ref) index: whoever runs second no-ops.
 *
 * Configure in Razorpay Dashboard → Webhooks:
 *   URL:    https://techxfluence.com/api/payments/webhook
 *   Secret: RAZORPAY_WEBHOOK_SECRET (env)
 *   Event:  payment.captured
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const body = JSON.parse(raw);
  if (body.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: body.event });
  }

  const p = body.payload?.payment?.entity;
  const notes = (p?.notes ?? {}) as Record<string, string>;
  if (!p?.id || !notes.kind) {
    return NextResponse.json({ ok: true, ignored: "no fulfilment notes" });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    if (notes.kind === "ticket") {
      const { data: payment, error: payErr } = await admin
        .from("payments")
        .insert({
          user_id: notes.userId || null,
          stream: "ticket_sales",
          amount: p.amount,
          currency: p.currency || "INR",
          status: "paid",
          provider: "razorpay",
          provider_ref: p.id,
          related_type: "events",
          related_id: notes.eventId,
        })
        .select("id")
        .single();

      // 23505 → verify already fulfilled this payment. Done.
      if (payErr) {
        if (payErr.code === "23505") return NextResponse.json({ ok: true, dedup: true });
        throw payErr;
      }

      // The pending order already holds the seats and carries the priced
      // quantity — fulfilling it is idempotent, so a retried webhook is safe.
      const { error: regErr } = await admin.rpc("fulfil_order", {
        p_order_id: notes.orderId,
        p_payment_id: payment.id,
      });
      if (regErr) {
        console.error("Webhook ticket fulfilment failed:", regErr.message);
      }
      // fulfil_order redeems the promo itself — nothing extra to do here.
    }

    if (notes.kind === "membership" && notes.userId && notes.tier) {
      const { data: plan } = await admin
        .from("membership_plans")
        .select("id")
        .eq("tier", notes.tier)
        .maybeSingle();

      const { error: payErr } = await admin.from("payments").insert({
        user_id: notes.userId,
        stream: "membership",
        amount: p.amount,
        currency: p.currency || "INR",
        status: "paid",
        provider: "razorpay",
        provider_ref: p.id,
        related_type: "membership_plans",
        related_id: plan?.id ?? null,
      });
      if (payErr) {
        if (payErr.code === "23505") return NextResponse.json({ ok: true, dedup: true });
        throw payErr;
      }

      const renewsAt = new Date(Date.now() + 30 * 86400000).toISOString();
      const { data: existing } = await admin
        .from("memberships")
        .select("id")
        .eq("user_id", notes.userId)
        .maybeSingle();
      if (existing) {
        await admin
          .from("memberships")
          .update({
            plan_id: plan?.id ?? null,
            tier: notes.tier,
            status: "active",
            started_at: new Date().toISOString(),
            renews_at: renewsAt,
            cancelled_at: null,
            payment_provider_ref: p.id,
          })
          .eq("user_id", notes.userId);
      } else {
        await admin.from("memberships").insert({
          user_id: notes.userId,
          plan_id: plan?.id ?? null,
          tier: notes.tier,
          status: "active",
          started_at: new Date().toISOString(),
          renews_at: renewsAt,
          payment_provider_ref: p.id,
        });
      }
      if (notes.tier === "Elite") {
        await admin.from("users").update({ discoverable: true }).eq("id", notes.userId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook processing failed:", err);
    // Non-2xx → Razorpay retries, which is what we want on transient failures.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
