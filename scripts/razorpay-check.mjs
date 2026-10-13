/**
 * Buy a ticket, end to end, against whatever keys are in .env.local.
 *
 *   npm run check:razorpay           # against http://localhost:3001
 *   SITE=http://localhost:3000 npm run check:razorpay
 *
 * Razorpay settings are per ACCOUNT, not per integration: payment capture
 * mode, enabled methods, webhooks and branding all live on the merchant and
 * none of them carry across from another one. So "the code works" is a claim
 * about this repository, and "payments work" is a claim about one account —
 * and the second has to be re-made every time the keys change hands.
 *
 * What it does NOT do is enter a card. The card screen is Razorpay's, not
 * ours; what is ours is the order, the signature check and the fulfilment, so
 * it drives those directly: create a real order through the real route, then
 * post the capture at the webhook exactly as Razorpay would, correctly signed.
 * That covers more of this code than clicking through checkout would, because
 * the webhook is the path that runs when the buyer's browser dies.
 *
 * Everything it writes, it deletes: the order, the payment, the registration,
 * the seat it took and the throwaway account it bought with. Cleanup runs even
 * when an assertion fails, because a half-finished check that leaves a held
 * seat behind is worse than no check.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const SITE = process.env.SITE ?? "http://localhost:3001";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(),
                 l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const { NEXT_PUBLIC_SUPABASE_URL: U, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON,
        SUPABASE_SERVICE_ROLE_KEY: SERVICE, RAZORPAY_KEY_ID: KEY_ID,
        RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WH } = env;
for (const [k, v] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: SERVICE,
  RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WH })) {
  if (!v) { console.error(`✖ ${k} is not set in .env.local`); process.exit(1); }
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log("  ✅ " + m)) : (fail++, console.log("  ❌ " + m)); return c; };

const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const db = {
  get: async (q) => (await fetch(`${U}/rest/v1/${q}`, { headers: H })).json(),
  patch: async (q, body) => fetch(`${U}/rest/v1/${q}`, { method: "PATCH", headers: H, body: JSON.stringify(body) }),
  del: async (q) => fetch(`${U}/rest/v1/${q}`, { method: "DELETE", headers: H }),
};
const rzp = async (p) => {
  const auth = "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const r = await fetch(`https://api.razorpay.com/v1/${p}`, { headers: { Authorization: auth } });
  return { status: r.status, j: await r.json().catch(() => ({})) };
};

console.log(`\nRazorpay end-to-end check\n  site    ${SITE}\n  project ${U}\n  key     ${KEY_ID}\n`);

// ── The account these keys belong to ────────────────────────────────────────
console.log("Account");
const probe = await rzp("payments?count=1");
if (!ok(probe.status === 200, `keys accepted by Razorpay (${probe.status})`)) {
  console.log(`     ${JSON.stringify(probe.j).slice(0, 200)}`);
  process.exit(1);
}
ok(KEY_ID.startsWith("rzp_test_"), `test mode — real cards cannot be charged (${KEY_ID.slice(0, 9)})`);
const hooks = await rzp("webhooks");
const merchant = hooks.j?.items?.[0]?.owner_id;
console.log(`  ·  merchant id: ${merchant ?? "unknown (no webhook on this account to read it from)"}`);
console.log(`  ·  webhooks on this account: ${hooks.j?.items?.length ?? 0}`);
for (const w of hooks.j?.items ?? []) {
  const on = Object.entries(w.events ?? {}).filter(([, v]) => v).map(([k]) => k);
  console.log(`     ${w.url}  [${on.join(", ")}]  active=${w.active}`);
}

// ── Something to buy ────────────────────────────────────────────────────────
console.log("\nWhat is on sale");
const events = await db.get("events?status=eq.published&price_type=eq.Paid&select=id,slug,title,price_amount&order=date.asc");
if (!ok(events.length > 0, `a published paid event exists (${events.length})`)) process.exit(1);
const ev = events[0];
const tiers = await db.get(`ticket_types?event_id=eq.${ev.id}&is_hidden=eq.false&select=id,name,price_amount,capacity,sold&order=sort_order.asc`);
if (!ok(tiers.length > 0, `it has a visible ticket tier (${tiers.length})`)) process.exit(1);
const tier = tiers[0];
console.log(`  ·  ${ev.title} — ${tier.name} ₹${(tier.price_amount / 100).toFixed(2)}, ${tier.sold}/${tier.capacity} sold`);

// ── A throwaway buyer ───────────────────────────────────────────────────────
const email = `rzp-check-${Date.now()}@txf.test`;
const password = "Chk-" + crypto.randomBytes(16).toString("hex");
let buyerId = null, txfOrderId = null, payId = null;

try {
  const made = await (await fetch(`${U}/auth/v1/admin/users`, { method: "POST", headers: H,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: "Razorpay Check" } }) })).json();
  buyerId = made.id;
  if (!ok(!!buyerId, `throwaway buyer created (${email})`)) throw new Error("no buyer");

  const tok = await (await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }) })).json();
  if (!ok(!!tok.access_token, "they can sign in")) throw new Error("no session");
  const ref = U.match(/https:\/\/([^.]+)\./)[1];
  const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(tok)).toString("base64")}`;

  // ── Checkout ──────────────────────────────────────────────────────────────
  console.log("\nCheckout");
  const res = await fetch(`${SITE}/api/payments/ticket-order`, { method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ eventId: ev.id, ticketTypeId: tier.id, quantity: 1,
      attendee_name: "Razorpay Check", attendee_email: email, attendee_phone: "+919000000000" }) });
  const order = await res.json();
  if (!ok(res.status === 200, `POST /api/payments/ticket-order → ${res.status} ${res.status === 200 ? "" : JSON.stringify(order).slice(0, 140)}`)) throw new Error("order failed");
  txfOrderId = order.txfOrderId;
  ok(order.amount === tier.price_amount, `priced at the tier, not guessed (${order.amount} paise)`);
  ok(order.keyId === KEY_ID, "the browser is handed this account's key id");
  ok(/^order_/.test(order.orderId ?? ""), `Razorpay order created (${order.orderId})`);
  const live = await rzp(`orders/${order.orderId}`);
  ok(live.status === 200 && live.j.amount === tier.price_amount,
     `and Razorpay agrees it exists for ₹${(live.j.amount / 100).toFixed(2)}`);
  ok(live.j?.notes?.kind === "ticket" && live.j?.notes?.orderId === txfOrderId,
     "carrying the notes the webhook fulfils from");

  // ── The webhook, as Razorpay would send it ────────────────────────────────
  console.log("\nWebhook");
  payId = "pay_CHK" + crypto.randomBytes(6).toString("hex");
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: {
    id: payId, amount: order.amount, currency: order.currency, status: "captured",
    order_id: order.orderId, notes: { kind: "ticket", orderId: txfOrderId, userId: buyerId, eventId: ev.id } } } } });
  const sign = (b) => crypto.createHmac("sha256", WH).update(b).digest("hex");
  const post = (b, sig) => fetch(`${SITE}/api/payments/webhook`, { method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": sig }, body: b });

  let r = await post(body, sign(body));
  ok(r.status === 200, `a correctly signed payment.captured → ${r.status}`);
  r = await post(body, sign(body));
  const again = await r.json();
  ok(r.status === 200 && again.dedup === true, "the same delivery again is a no-op, not a second ticket");
  r = await post(body.replace(`"amount":${order.amount}`, '"amount":100'), sign(body));
  ok(r.status === 400, `a tampered body with the same signature → ${r.status}`);
  r = await post(JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_x", notes: {} } } } }), sign(JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_x", notes: {} } } } })));
  ok((await r.json()).ignored === "no fulfilment notes", "a payment with no fulfilment notes is ignored, not half-processed");

  // ── Did it actually issue a ticket ────────────────────────────────────────
  console.log("\nFulfilment");
  const [o] = await db.get(`orders?id=eq.${txfOrderId}&select=status,total,payment_id`);
  ok(o?.status === "paid", `the order is paid (${o?.status})`);
  const [p] = await db.get(`payments?provider_ref=eq.${payId}&select=amount,status,stream,provider`);
  ok(p?.status === "paid" && p?.amount === order.amount && p?.provider === "razorpay",
     `a payment is recorded (₹${((p?.amount ?? 0) / 100).toFixed(2)} ${p?.stream})`);
  const [reg] = await db.get(`registrations?order_id=eq.${txfOrderId}&select=status,ticket_code,attendee_email`);
  ok(reg?.status === "registered" && !!reg?.ticket_code, `a ticket is issued (${reg?.ticket_code})`);
  const [after] = await db.get(`ticket_types?id=eq.${tier.id}&select=sold`);
  ok(after?.sold === tier.sold + 1, `the seat is taken (sold ${tier.sold} → ${after?.sold})`);
} catch (e) {
  console.log(`  ❌ stopped: ${e.message}`);
  fail++;
} finally {
  console.log("\nCleaning up");
  if (txfOrderId) {
    await db.del(`registrations?order_id=eq.${txfOrderId}`);
    await db.del(`orders?id=eq.${txfOrderId}`);
  }
  if (payId) await db.del(`payments?provider_ref=eq.${payId}`);
  await db.patch(`ticket_types?id=eq.${tier.id}`, { sold: tier.sold });
  if (buyerId) await fetch(`${U}/auth/v1/admin/users/${buyerId}`, { method: "DELETE", headers: H });
  const [t] = await db.get(`ticket_types?id=eq.${tier.id}&select=sold`);
  console.log(`  ·  seat count back to ${t?.sold}, throwaway account deleted, rows removed`);
}

console.log(`\n${pass} passed, ${fail} failed` +
  (fail === 0 ? ` — this account can take a ₹${(tier.price_amount / 100).toFixed(2)} ticket and issue it.\n` : "\n"));
process.exit(fail ? 1 : 0);
