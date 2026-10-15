/**
 * Create a host: somebody who runs their own events and nobody else's.
 *
 * Run it through scripts/create-host.sh, which is what asks for the password.
 * This file never prints a password, never writes one to disk, and reads it
 * from a pipe rather than from argv, because argv is visible in `ps` to every
 * other process on the machine.
 *
 * What "admin" means here, since 0054 removed the platform that used to
 * answer this: one row in tenant_members, with role 'admin' and status
 * 'active', for this business. Every predicate the site gates on reads that
 * same row —
 *
 *   is_admin()     role = 'admin'
 *   is_host()      role in ('event_host', 'admin')   → hosting, check-in
 *   is_employee()  role in ('employee',  'admin')    → staff reads
 *   bos_can_access() admin or employee               → events, registrations
 *
 * so one row grants events, hosts, members, payouts and the admin console
 * together. public.users.primary_role and public.user_roles are also set:
 * they do not grant anything, but they are what the navigation and the role
 * theme read, and leaving them behind produces an account that has the power
 * and not the menus.
 *
 * Safe to re-run. It repairs a partial account rather than failing on it,
 * which is what the three accounts left in auth with no profile need.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(),
                 l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !SERVICE || !ANON) {
  console.error("✖ .env.local is missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const [email, fullName, slug] = process.argv.slice(2);
if (!email || !fullName) {
  console.error("usage: create-host.sh <email> \"<full name>\" [event-slug]");
  process.exit(1);
}

/** The password arrives on stdin so it never appears in argv or in history. */
const password = await new Promise((resolve) => {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (d) => (buf += d));
  process.stdin.on("end", () => resolve(buf.replace(/\r?\n$/, "")));
});
if (password.length < 8) {
  console.error("✖ No password on stdin, or shorter than 8 characters. Nothing was changed.");
  process.exit(1);
}

const db = createClient(URL, SERVICE, { auth: { persistSession: false } });
const say = (s) => console.log("  " + s);
console.log(`\nTechxfluence admin: ${email}`);
console.log(`Project: ${URL}\n`);

// ── 1. The business this person will administer ─────────────────────────────
const { data: tenants, error: tErr } = await db
  .from("tenants").select("id,name,slug,status,is_default").order("name");
if (tErr) { console.error("✖ Could not read tenants:", tErr.message); process.exit(1); }
if (tenants.length !== 1) {
  console.error(`✖ Expected exactly one business in this database, found ${tenants.length}: ` +
    tenants.map((t) => t.slug).join(", ") +
    ".\n  This script is for a single-tenant site. Pick the tenant deliberately before running it again.");
  process.exit(1);
}
const tenant = tenants[0];
say(`business: ${tenant.name} (${tenant.slug}, ${tenant.status})`);

// ── 2. The auth account ─────────────────────────────────────────────────────
// listUsers is paged; ask for enough pages to cover a small site rather than
// assuming the first 50 rows contain the address.
let account = null;
for (let page = 1; page <= 20 && !account; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error("✖ Could not list accounts:", error.message); process.exit(1); }
  account = (data.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if ((data.users ?? []).length < 200) break;
}

if (!account) {
  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) { console.error("✖ Could not create the account:", error.message); process.exit(1); }
  account = data.user;
  say(`account created, email already confirmed (${account.id})`);
} else {
  const { error } = await db.auth.admin.updateUserById(account.id, {
    password, email_confirm: true, user_metadata: { ...account.user_metadata, full_name: fullName },
  });
  if (error) { console.error("✖ Could not update the account:", error.message); process.exit(1); }
  say(`account already existed — password set and email confirmed (${account.id})`);
}

// ── 3. The profile the navigation reads ─────────────────────────────────────
// handle_new_user() writes this row on sign-up, as 'community_member'. On a
// repair there may be no row at all, so upsert rather than update: an update
// that matches nothing reports success and changes nothing, which is how the
// three orphaned accounts in this project came to look fine and work badly.
const { error: uErr } = await db.from("users").upsert({
  id: account.id, email, full_name: fullName, primary_role: "event_host", host_status: "approved",
}, { onConflict: "id" });
if (uErr) { console.error("✖ Could not write the profile:", uErr.message); process.exit(1); }
say("profile: primary_role = event_host");

// ── 4. The grant that actually grants ───────────────────────────────────────
const { data: existing } = await db.from("tenant_members")
  .select("id,role,status").eq("tenant_id", tenant.id).eq("user_id", account.id).maybeSingle();
if (existing) {
  const { error } = await db.from("tenant_members")
    .update({ role: "event_host", status: "active" }).eq("id", existing.id);
  if (error) { console.error("✖ Could not promote the membership:", error.message); process.exit(1); }
  say(`membership: ${existing.role}/${existing.status} → event_host/active`);
} else {
  const { error } = await db.from("tenant_members")
    .insert({ tenant_id: tenant.id, user_id: account.id, role: "event_host", status: "active" });
  if (error) { console.error("✖ Could not create the membership:", error.message); process.exit(1); }
  say("membership: event_host/active (created)");
}

// ── 5. The legacy grant table, which getUserRole still falls back to ────────
for (const role of ["event_host"]) {
  const { data: had } = await db.from("user_roles")
    .select("id").eq("user_id", account.id).eq("role", role).maybeSingle();
  if (!had) {
    const { error } = await db.from("user_roles").insert({ user_id: account.id, role });
    if (error) { console.error(`✖ Could not grant ${role}:`, error.message); process.exit(1); }
  }
}
say("user_roles: event_host");

// ── 6. Prove it, as the account itself ──────────────────────────────────────
// Everything above was done with the service role, which bypasses RLS and so
// proves nothing about what this person can actually do. This signs in with
// the public key and the password that was just set, and asks the database
// the same four questions the site asks on every request.
console.log("\nSigning in as that account to check it, with the public key:");
const asUser = createClient(URL, ANON, { auth: { persistSession: false } });
const { data: session, error: sErr } = await asUser.auth.signInWithPassword({ email, password });
if (sErr) {
  console.error("  ✖ Sign-in failed:", sErr.message);
  console.error("    The grants above are in place, but the password did not take. Nothing else was changed.");
  process.exit(1);
}
say(`✅ signed in (session for ${session.user.email})`);

let bad = 0;
for (const [fn, what] of [
  ["is_host", "their own events, attendees and check-in"],
]) {
  const { data, error } = await asUser.rpc(fn);
  const pass = !error && data === true;
  if (!pass) bad++;
  say(`${pass ? "✅" : "❌"} ${fn}() → ${error ? error.message : data}   ${what}`);
}
const { data: evts, error: eErr } = await asUser.from("events").select("id", { count: "exact", head: true });
say(`${eErr ? "❌" : "✅"} can read events${eErr ? ": " + eErr.message : ""}`);
if (eErr) bad++;
await asUser.auth.signOut();

// ── 7. Assign the event, when one was named ────────────────────────────────
if (slug) {
  const { data: ev, error: evErr } = await db
    .from("events").select("id,title,host_id").eq("slug", slug).maybeSingle();
  if (evErr || !ev) {
    console.error(`  ✖ No event with slug "${slug}" — the account is set up, the assignment is not.`);
    bad++;
  } else {
    const { error } = await db.from("events")
      .update({ host_id: account.id, host_name: fullName }).eq("id", ev.id);
    if (error) { console.error("  ✖ Could not assign the event:", error.message); bad++; }
    else say(`✅ assigned "${ev.title}" — they can now edit it and see its attendees`);
  }
}

console.log(bad === 0
  ? `\n✅ ${email} is a host on ${tenant.name}. Sign in at /login, then /host/dashboard.\n`
  : `\n⚠️  ${bad} check(s) failed. The account exists and can sign in, but something above did not take.\n`);
process.exit(bad === 0 ? 0 : 1);
