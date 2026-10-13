/**
 * The Business OS is gone from this database, and the site it shared one with
 * still works.
 *
 * 0054 removed the platform that drove the OS; 0055 removes the OS. That is
 * 51 tables and 95 → 44, which is the kind of change where the interesting
 * question is never "did the drops run" but "what was holding on to them".
 *
 * Two things nearly went that should not have. plan_benefits is only ever read
 * through a nested select inside a membership_plans query, so a grep for
 * .from("plan_benefits") finds nothing and the perks list on /membership and
 * /profile would have emptied silently. cities, payouts, promo_codes and
 * rate_limits have no direct reader either -- the app reaches all four only
 * through a function, and dropping them would have broken the homepage stats,
 * host earnings, discount codes and the contact-form rate limit respectively.
 * Each is asserted below by name so a future tidy-up has to argue with a test.
 *
 * The other half is bos_can_access, which 0055 redefines rather than drops. It
 * gates four policies on events and registrations, and it used to require a
 * row in employee_module_access that nothing can write any more.
 */
import { freshDb, counter } from "./_db.mjs";

const { state, ok } = counter();
const { db, skipped } = await freshDb();
ok(skipped.length === 0, `every migration applied cleanly (${skipped.length} failures)`);

const q = async (s) => (await db.query(s)).rows;
const n = async (s) => Number((await q(s))[0].c);
const tables = async () =>
  (await q(`select relname from pg_class c join pg_namespace s on s.oid=c.relnamespace
            where s.nspname='public' and c.relkind='r' order by 1`)).map((r) => r.relname);

const DROPPED = `app_modules approvals asset_versions assets audit_log budgets campaigns
cashflow_months competitors complaints content_items data_fields dependencies email_templates
employee_kpis employee_module_access employee_profiles event_ops expenses feedback goals
govern_changes hiring_plan host_messages influencers inventory inventory_custody kpi_values kpis
leads legal_items partnerships podcast_episodes products revenue_entries reviews risks
sop_acknowledgements sop_documents sop_run_items sop_runs sop_steps sop_versions sops sponsorships
task_comments task_reviews tasks tenant_products vendors workstreams`.split(/\s+/);

/** Every table the site still needs, named so a wrong drop fails here. */
const KEPT = `activities ambassadors badges benefits cities communities community_files
community_gates community_members contact_messages email_failures event_agenda event_questions
event_speakers events file_unlocks host_submissions leader_profiles membership_plans memberships
newsletter_subscribers notifications orders organizer_follows partners payments payouts
plan_benefits point_events post_comments post_reactions post_reports posts promo_codes rate_limits
registrations saved_events speakers tenant_members tenants ticket_types user_badges user_roles
users`.split(/\s+/);

const live = await tables();
console.log("\nThe OS tables are gone:");
ok(DROPPED.length === 51, `the drop list names 51 tables (${DROPPED.length})`);
const survivors = DROPPED.filter((t) => live.includes(t));
ok(survivors.length === 0, `none of them survived (${survivors.join(", ") || "none"})`);

console.log("\nAnd every table the site reads is still there:");
const missing = KEPT.filter((t) => !live.includes(t));
ok(missing.length === 0, `all ${KEPT.length} kept tables present (${missing.join(", ") || "none missing"})`);
const unaccounted = live.filter((t) => !KEPT.includes(t));
ok(unaccounted.length === 0,
   `and nothing else is left unaccounted for (${unaccounted.join(", ") || "none"})`);
ok(live.length === 44, `44 tables, down from 95 (${live.length})`);

console.log("\nThe four tables with no direct reader — each one a silent breakage if dropped:");
for (const [t, why] of [
  ["cities", "public_stats() counts them for the homepage band"],
  ["payouts", "get_host_earnings / record_payout — host money"],
  ["promo_codes", "fulfil_order / validate_promo — discounts at checkout"],
  ["rate_limits", "bos_rate_limit() — the contact and newsletter forms"],
  ["plan_benefits", "read through a nested select; the perks on /membership"],
]) ok(live.includes(t), `${t} kept: ${why}`);

console.log("\nNothing left in the database names something that was dropped:");
const dangling = [];
for (const t of DROPPED) {
  const f = await q(`select distinct p.proname from pg_proc p join pg_namespace s on s.oid=p.pronamespace
    where s.nspname='public' and p.prosrc ~ '\\mpublic\\.${t}\\M'`);
  for (const r of f) dangling.push(`${r.proname} → ${t}`);
}
ok(dangling.length === 0, `no surviving function reads a dropped table (${dangling.join("; ") || "none"})`);
// \m / \M so community_leads() does not read as the dropped `leads` table.
const dpol = await q(`select tablename, policyname from pg_policies where schemaname='public'
  and (coalesce(qual,'')||coalesce(with_check,'')) ~ '\m(${DROPPED.join("|")})\M'`);
ok(dpol.length === 0,
   `nor any policy (${dpol.map((d) => `${d.tablename}:${d.policyname}`).join(", ") || "none"})`);

console.log("\nbos_can_access is now staff access, which is what one business means:");
const src = (await q(`select prosrc from pg_proc p join pg_namespace s on s.oid=p.pronamespace
  where s.nspname='public' and p.proname='bos_can_access'`))[0].prosrc;
ok(!/employee_module_access/.test(src), "it no longer needs a grant row nothing can write");
ok(!/bos_product_enabled/.test(src), "nor a product enabled by a console that has left");
ok(/is_admin/.test(src) && /bos_is_staff/.test(src), "it asks whether you are an admin or an employee here");
ok(await n(`select count(*) c from pg_policies where schemaname='public'
            and (coalesce(qual,'')||coalesce(with_check,'')) like '%bos_can_access%'`) === 4,
   "and the four policies that call it — events read/update/write, registrations read — still do");

// The behavioural half. A predicate that returns the right shape and the wrong
// answer passes every check above.
const TENANT = (await q(`select id from public.tenants limit 1`))[0].id;
const [ADMIN, EMP, MEMBER] = [
  "aaaaaaaa-0000-0000-0000-000000000001",
  "bbbbbbbb-0000-0000-0000-000000000002",
  "cccccccc-0000-0000-0000-000000000003",
];
// Inserting into auth.users is enough to get all three a profile and a
// membership: handle_new_user mirrors the account into public.users and
// bos_seed_tenant_membership joins them to this business as a community
// member. So the roles are set by UPDATE — an insert here conflicts with the
// row the trigger already wrote, and `on conflict do nothing` would leave all
// three as members while reporting nothing at all.
await db.exec(`insert into auth.users(id,email) values
  ('${ADMIN}','a@t.test'),('${EMP}','e@t.test'),('${MEMBER}','m@t.test');`);
for (const [u, role] of [[ADMIN, "admin"], [EMP, "employee"], [MEMBER, "community_member"]]) {
  const r = await db.query(`update public.tenant_members set role='${role}', status='active'
     where user_id='${u}' and tenant_id='${TENANT}' returning user_id`);
  ok(r.rows.length === 1, `fixture: ${role} is a member of this business`);
}

const asUser = (u) => db.exec(`set role authenticated; set request.jwt.claim.sub='${u}';`);
const canAccess = async (u) => {
  await asUser(u);
  return (await q(`select public.bos_can_access('events') c`))[0].c;
};
console.log("\nand it answers correctly for each of the three kinds of member:");
ok((await canAccess(ADMIN)) === true, "an admin of this business can work on events");
ok((await canAccess(EMP)) === true,
   "an employee can too — before 0055 they could not, because nothing could grant them the section");
ok((await canAccess(MEMBER)) === false, "a community member cannot");
await db.exec(`reset role; set request.jwt.claim.sub='';`);

console.log("\nAnd the functions that take money are untouched:");
for (const f of ["register_for_event", "create_pending_order", "fulfil_order", "check_in_ticket",
                 "cancel_registration", "record_payout", "expire_pending_orders", "validate_promo",
                 "redeem_promo", "public_stats", "get_host_earnings", "is_admin", "is_host",
                 "is_employee", "bos_rate_limit"]) {
  ok(await n(`select count(*) c from pg_proc p join pg_namespace s on s.oid=p.pronamespace
              where s.nspname='public' and p.proname='${f}'`) >= 1, `${f} intact`);
}

console.log(`\n${state.pass} passed, ${state.fail} failed`);
process.exit(state.fail ? 1 : 0);
