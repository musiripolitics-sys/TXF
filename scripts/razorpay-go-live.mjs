/**
 * Move the live site from Razorpay test mode to live mode, in one pass.
 *
 * Run it through scripts/razorpay-go-live.sh, which is what asks for the key
 * secret. Nothing here prints a secret, writes one to disk, or takes one from
 * argv — argv is readable by every other process on the machine via `ps`.
 *
 * It does five things, and stops at the first that fails:
 *
 *   1. checks the live keys actually work, and are live rather than test
 *   2. creates the live-mode webhook (Razorpay keeps test and live webhooks
 *      in separate worlds; the test one does not carry over), subscribed to
 *      payment.captured alone, with a freshly generated secret
 *   3. writes all three values to Netlify, production context
 *   4. redeploys, because Netlify fixes a function's environment at deploy
 *      time and a variable added afterwards never reaches the running code —
 *      which is exactly how the webhook secret sat unused for six days
 *   5. posts a correctly-signed delivery at the live endpoint and checks it
 *      is accepted, and that a forged one is rejected
 *
 * .env.local is deliberately left alone. Local development stays on the test
 * keys; the point of test mode is that a mistake on your laptop costs nobody
 * any money.
 */
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";

const WEBHOOK_URL = "https://techxfluence.com/api/payments/webhook";
const ALERT_EMAIL = "admin@techxfluence.com";

const die = (m) => { console.error(`\n✖ ${m}\n`); process.exit(1); };
const say = (s) => console.log("  " + s);

// ── Credentials, from the terminal and from the places they already live ────
const keyId = process.argv[2];
const expectMerchant = process.argv[3] ?? null;
if (!keyId) die("usage: razorpay-go-live.sh <rzp_live_key_id> [expected_merchant_id]");
if (!keyId.startsWith("rzp_live_")) {
  die(`"${keyId}" is not a live key id. Live keys start rzp_live_; rzp_test_ keys take only test cards.\n` +
      `  Razorpay Dashboard → switch the toggle to Live → Account & Settings → API Keys.`);
}

const keySecret = await new Promise((resolve) => {
  let b = ""; process.stdin.setEncoding("utf8");
  process.stdin.on("data", (d) => (b += d));
  process.stdin.on("end", () => resolve(b.replace(/\r?\n$/, "")));
});
if (keySecret.length < 12) die("No key secret on stdin, or implausibly short. Nothing was changed.");

const netlifyCfg = `${os.homedir()}/Library/Preferences/netlify/config.json`;
if (!fs.existsSync(netlifyCfg)) die(`No Netlify credential at ${netlifyCfg}. Run \`netlify login\` first.`);
const netlifyToken = Object.values(JSON.parse(fs.readFileSync(netlifyCfg, "utf8")).users)[0]?.auth?.token;
if (!netlifyToken) die("The Netlify config holds no token. Run `netlify login` first.");
const siteId = JSON.parse(fs.readFileSync(".netlify/state.json", "utf8")).siteId;

const rzp = async (p, init = {}) => {
  const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const r = await fetch(`https://api.razorpay.com/v1/${p}`, {
    ...init, headers: { Authorization: auth, "Content-Type": "application/json", ...(init.headers || {}) } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
};
const netlify = async (p, init = {}) => {
  const r = await fetch(`https://api.netlify.com/api/v1/${p}`, {
    ...init, headers: { Authorization: `Bearer ${netlifyToken}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
};

console.log(`\nRazorpay → live mode\nSite: ${WEBHOOK_URL.replace("/api/payments/webhook", "")}\n`);

// ── 1. Do the keys work, and are they live? ─────────────────────────────────
console.log("1. Checking the keys");
const probe = await rzp("payments?count=1");
if (probe.status === 401) die("Razorpay rejected those credentials. Nothing was changed.");
if (probe.status !== 200) die(`Razorpay returned ${probe.status}: ${JSON.stringify(probe.j).slice(0, 200)}`);
say(`✅ accepted — ${keyId} (live)`);
say(`   ${probe.j.count} payment(s) on the live account so far`);

// ── 2. The live-mode webhook ────────────────────────────────────────────────
console.log("\n2. Webhook");
const webhookSecret = crypto.randomBytes(32).toString("hex");
const existing = (await rzp("webhooks")).j?.items?.find((w) => w.url === WEBHOOK_URL);
// Razorpay wants the event map its own GET returns, not the array the docs
// show; the array form is refused with "the json request could not be decoded".
const events = { "payment.captured": true };
let r;
if (existing) {
  const live = Object.fromEntries(Object.keys(existing.events).map((k) => [k, k === "payment.captured"]));
  r = await rzp(`webhooks/${existing.id}`, { method: "PUT", body: JSON.stringify(
    { url: WEBHOOK_URL, alert_email: ALERT_EMAIL, secret: webhookSecret, events: live }) });
  if (r.status !== 200) die(`Could not update the live webhook: ${JSON.stringify(r.j).slice(0, 200)}`);
  say(`✅ updated the existing live webhook ${existing.id} — payment.captured only, new secret`);
} else {
  r = await rzp("webhooks", { method: "POST", body: JSON.stringify(
    { url: WEBHOOK_URL, alert_email: ALERT_EMAIL, secret: webhookSecret, events }) });
  if (r.status !== 200 && r.status !== 201) die(`Could not create the live webhook: ${JSON.stringify(r.j).slice(0, 200)}`);
  say(`✅ created live webhook ${r.j.id} — payment.captured only`);
}
say(`   alerts on failure go to ${ALERT_EMAIL}`);

/**
 * Whose account is this, really?
 *
 * This site was built against one Razorpay account and the money is meant to
 * land in another; the two were told apart only by noticing that a payment
 * link's merchant id did not match the webhook's owner. Nothing in a key id
 * says which account it belongs to, so the check is made here — after the
 * webhook, which is the first object that reports an owner, and before
 * Netlify, which is the first change that is awkward to undo.
 */
const created = (await rzp("webhooks")).j?.items?.find((w) => w.url === WEBHOOK_URL);
const merchant = created?.owner_id;
say(`   merchant id: ${merchant ?? "unknown"}`);
if (expectMerchant && merchant && merchant !== expectMerchant) {
  if (!existing) await rzp(`webhooks/${created.id}`, { method: "DELETE" });
  die(`These keys belong to merchant ${merchant}, not ${expectMerchant}.\n` +
      `  Payments would land in the wrong Razorpay account.\n` +
      `  The webhook just created has been removed again; Netlify was not touched.`);
}
if (expectMerchant && merchant === expectMerchant) say(`✅ that is the account you named`);

// ── 3. Netlify ──────────────────────────────────────────────────────────────
console.log("\n3. Netlify environment");
const site = (await netlify(`sites/${siteId}`)).j;
if (!site?.account_slug) die("Could not read the Netlify site. Nothing further was changed — but the live webhook above now exists.");
say(`site ${site.name} (${site.account_slug})`);
for (const [key, value] of [
  ["RAZORPAY_KEY_ID", keyId],
  ["RAZORPAY_KEY_SECRET", keySecret],
  ["RAZORPAY_WEBHOOK_SECRET", webhookSecret],
]) {
  const res = await netlify(`accounts/${site.account_slug}/env/${key}?site_id=${siteId}`, {
    method: "PATCH",
    body: JSON.stringify({ context: "production", value }),
  });
  if (res.status !== 200 && res.status !== 201) die(`Could not set ${key}: ${res.status} ${JSON.stringify(res.j).slice(0, 200)}`);
  say(`✅ ${key} set (production)`);
}

// ── 4. Redeploy ─────────────────────────────────────────────────────────────
console.log("\n4. Redeploying — the running function will not see the new values without this");
const build = await netlify(`sites/${siteId}/builds`, { method: "POST", body: JSON.stringify({ clear_cache: false }) });
if (build.status !== 200) die(`Could not start a build: ${build.status} ${JSON.stringify(build.j).slice(0, 200)}`);
const deployId = build.j.deploy_id;
say(`deploy ${deployId} started`);
let state = "";
for (let i = 0; i < 80; i++) {
  await new Promise((s) => setTimeout(s, 10000));
  const d = (await netlify(`deploys/${deployId}`)).j;
  if (d.state !== state) { state = d.state; say(`   ${state}`); }
  if (state === "ready") break;
  if (["error", "rejected"].includes(state)) die(`The deploy failed: ${d.error_message ?? state}`);
}
if (state !== "ready") die("The deploy did not finish in thirteen minutes. Check the Netlify dashboard.");
say("✅ published");

// ── 5. Prove the loop ───────────────────────────────────────────────────────
// payment.authorized is a type the handler ignores: it returns early and
// writes nothing, so this asks "do the two secrets match" and no more.
console.log("\n5. Checking the live endpoint");
const body = JSON.stringify({ event: "payment.authorized", payload: {} });
const sig = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
const good = await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json", "x-razorpay-signature": sig }, body });
const goodText = (await good.text()).slice(0, 120);
const bad = await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json", "x-razorpay-signature": "0".repeat(64) }, body });

say(`${good.status === 200 ? "✅" : "❌"} correctly signed → ${good.status} ${goodText}`);
say(`${bad.status === 400 ? "✅" : "❌"} forged signature  → ${bad.status}`);

if (good.status === 200 && bad.status === 400) {
  console.log(`\n✅ Live. Payments land in merchant ${merchant ?? "(unknown)"}, and the webhook will fulfil an order even if the buyer's browser dies mid-payment.`);
  console.log(`   .env.local is untouched, so local development stays on the test keys.\n`);
} else {
  console.log(`\n⚠️  The switch is in place but the endpoint did not answer as expected. Do not take payments until this reads two ticks.\n`);
  process.exit(1);
}
