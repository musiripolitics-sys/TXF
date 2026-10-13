/**
 * Shreex is gone, and nothing this site needs went with it.
 *
 * The second half is the point. Removing a platform from a database it shares
 * with a live site is mostly an exercise in not cutting the wrong wire, and
 * one wire was nearly cut: bos_can_access reads like an OS function and gates
 * fourteen policies on this site's own event tables.
 */
import { freshDb, counter } from "./_db.mjs";

const { state, ok } = counter();
const { db, skipped } = await freshDb();
ok(skipped.length === 0, `every migration applied cleanly (${skipped.length} failures)`);

const q = async (s) => (await db.query(s)).rows;
const n = async (s) => Number((await q(s))[0].c);

console.log("\nThe platform's functions are gone:");
for (const f of ["bos_create_tenant", "bos_switch_tenant", "bos_my_tenants", "bos_invite_to_tenant",
                 "bos_grant_platform_admin", "bos_is_super_admin", "bos_is_platform_owner",
                 "bos_platform_stats", "bos_my_sections", "bos_search", "bos_dashboard_summary"]) {
  ok(await n(`select count(*) c from pg_proc p join pg_namespace s on s.oid=p.pronamespace
              where s.nspname='public' and p.proname='${f}'`) === 0, `${f} removed`);
}
// Named rather than counted. A count is a number to bump whenever anything
// is added — 0056's bos_take_seat broke it the first time — and bumping a
// number teaches nobody which functions are supposed to be here.
const KEPT_BOS = ["bos_can_access", "bos_claimed_tenant", "bos_current_tenant",
  "bos_guard_contact_rate", "bos_guard_newsletter_rate", "bos_is_staff",
  "bos_mirror_primary_role", "bos_rate_limit", "bos_request_tenant",
  "bos_seed_tenant_membership", "bos_stamp_host_stage", "bos_take_seat",
  "bos_tenant_default", "bos_tenant_role", "bos_touch_row"];
const liveBos = (await q(`select distinct p.proname from pg_proc p join pg_namespace s on s.oid=p.pronamespace
  where s.nspname='public' and p.proname like 'bos_%' order by 1`)).map((r) => r.proname);
const strayBos = liveBos.filter((f) => !KEPT_BOS.includes(f));
const goneBos = KEPT_BOS.filter((f) => !liveBos.includes(f));
ok(strayBos.length === 0 && goneBos.length === 0,
   `the ${KEPT_BOS.length} surviving bos_ functions are exactly the expected ones, down from 62` +
   (strayBos.length ? ` — unexpected: ${strayBos.join(", ")}` : "") +
   (goneBos.length ? ` — missing: ${goneBos.join(", ")}` : ""));

console.log("\nAnd its tables:");
for (const t of ["platform_admins", "tenant_invitations"]) {
  ok(await n(`select count(*) c from pg_class c join pg_namespace s on s.oid=c.relnamespace
              where s.nspname='public' and c.relname='${t}'`) === 0, `${t} removed`);
}

console.log("\nWhat this site runs on is untouched — this is the half that matters:");
ok(await n(`select count(*) c from pg_proc p join pg_namespace s on s.oid=p.pronamespace
            where s.nspname='public' and p.proname='bos_can_access'`) === 1,
   "bos_can_access survives — the policies on events and registrations call it");
ok(await n(`select count(*) c from pg_policies where schemaname='public'
            and (coalesce(qual,'')||coalesce(with_check,'')) like '%bos_can_access%'`) === 4,
   "and the four on events and registrations still do — the other ten were on OS tables 0055 dropped");
for (const t of ["tenants", "tenant_members"]) {
  ok(await n(`select count(*) c from pg_class c join pg_namespace s on s.oid=c.relnamespace
              where s.nspname='public' and c.relname='${t}'`) === 1, `${t} kept — the tenancy plumbing reads it`);
}
for (const f of ["register_for_event", "create_pending_order", "fulfil_order", "check_in_ticket",
                 "cancel_registration", "record_payout", "is_admin", "is_host", "bos_rate_limit"]) {
  ok(await n(`select count(*) c from pg_proc p join pg_namespace s on s.oid=p.pronamespace
              where s.nspname='public' and p.proname='${f}'`) >= 1, `${f} intact`);
}
ok(await n(`select count(*) c from pg_policies where schemaname='public' and permissive='RESTRICTIVE'`) === 38,
   "one isolation policy per surviving table — the plumbing stays until the columns go (38, from 87; the missing 49 went with their tables in 0055)");

console.log("\nis_admin no longer asks whether you run a platform that does not exist:");
const src = (await q(`select prosrc from pg_proc p join pg_namespace s on s.oid=p.pronamespace
                      where s.nspname='public' and p.proname='is_admin'`))[0].prosrc;
ok(!/bos_is_super_admin/.test(src), "the super-admin branch 0052 added is gone");
ok(/tenant_members/.test(src), "and it is back to membership of this business");

console.log("\nNothing is left referencing something that was dropped:");
const dangling = await q(`select p.proname from pg_proc p join pg_namespace s on s.oid=p.pronamespace
  where s.nspname='public' and (p.prosrc like '%bos_is_super_admin%' or p.prosrc like '%platform_admins%'
     or p.prosrc like '%tenant_invitations%' or p.prosrc like '%bos_my_sections%')`);
ok(dangling.length === 0, `no surviving function names a dropped object (${dangling.map(d=>d.proname).join(", ") || "none"})`);
const dpol = await q(`select policyname from pg_policies where schemaname='public'
  and (coalesce(qual,'')||coalesce(with_check,'')) like '%bos_is_super_admin%'`);
ok(dpol.length === 0, `nor does any policy (${dpol.map(d=>d.policyname).join(", ") || "none"})`);

console.log(`\n${state.pass} passed, ${state.fail} failed`);
process.exit(state.fail ? 1 : 0);
