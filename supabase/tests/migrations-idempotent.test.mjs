/**
 * Every migration can be run twice.
 *
 * Written because it was not true. 0051 dropped the policy name it was
 * REPLACING and not the one it was CREATING, so a second run failed with
 *
 *   42710: policy "platform owner writes products" for table "products"
 *          already exists
 *
 * and it failed in production, on a paste whose own header said "safe to run
 * twice". Every file in this repository claims idempotence in its comment
 * header; nothing checked. This does.
 *
 * It matters more than it looks. A migration that cannot be re-run cannot be
 * recovered from: a paste that fails halfway leaves a database in a state the
 * same paste can no longer repair, and the only way forward is to read the
 * file and work out by hand which statements already took.
 *
 * ── Why this applies each file twice in place, rather than replaying them all
 *
 * It used to build the whole repository and then replay all of it against the
 * finished schema. That measured something slightly different, and 0055 made
 * the difference fatal: 0055 drops 51 tables, so a replayed 0035 goes looking
 * for sponsorships to add a tenant_id to and finds that schema.sql created it
 * and 0055 took it away. Eight files failed that way, none of them for a
 * reason a reader of those files could have avoided.
 *
 * Two of the exemptions the old shape needed said why. A migration is
 * idempotent against the schema as it stood WHEN IT RAN, which is the only
 * sense in which the word is useful, and nobody re-pastes a 2026 migration
 * against a 2027 database. So each file is now applied, applied again
 * immediately, and only then followed by the next one — the schema each file
 * sees on its second run is the schema it just produced, which is exactly the
 * situation a half-applied paste leaves behind. That is a stricter test of the
 * claim the headers make, and it needs no exemptions: the two ON CONFLICT
 * cases were artefacts of replaying 0007 after 0036 had changed its index.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { counter, migrationFiles, applyMigration } from "./_db.mjs";

const { state, ok } = counter();

const AUTH_SHIM = `create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(), email text,
  raw_user_meta_data jsonb, raw_app_meta_data jsonb, encrypted_password text,
  email_confirmed_at timestamptz, created_at timestamptz default now(),
  updated_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as
  $fn$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $fn$;
create or replace function auth.role() returns text language sql stable as
  $fn$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'anon') $fn$;
create role authenticated; create role anon; create role service_role;
create or replace function gen_random_bytes(n int) returns bytea language sql as
  $fn$ select decode(md5(random()::text),'hex') $fn$;
create or replace function crypt(a text,b text) returns text language sql as $fn$ select a $fn$;
create or replace function gen_salt(a text) returns text language sql as $fn$ select 'x' $fn$;
create domain citext as text;`;

const strip = (s) => s.replace(/create extension if not exists (pgcrypto|citext);/g, "");
const schema = () => strip(fs.readFileSync("supabase/schema.sql", "utf8"));

const db = new PGlite();
await db.waitReady;
await db.exec(AUTH_SHIM);

let base = null;
try {
  await db.exec(schema());
  await db.exec(schema());
} catch (e) {
  base = e.message.split("\n")[0];
}
ok(base === null, base === null ? "schema.sql applied twice with no error" : `schema.sql: ${base}`);

const files = migrationFiles();
const firstRun = [];
const secondRun = [];
for (const f of files) {
  try {
    await applyMigration(db, f);
  } catch (e) {
    firstRun.push({ f, msg: e.message.split("\n")[0] });
    continue; // a file that never applied cannot be tested for re-applying
  }
  try {
    await applyMigration(db, f);
  } catch (e) {
    secondRun.push({ f, msg: e.message.split("\n")[0] });
  }
}

for (const { f, msg } of firstRun) console.log(`     ${f}: ${msg}`);
ok(firstRun.length === 0, `all ${files.length} migrations applied cleanly the first time (${firstRun.length} failures)`);

for (const { f, msg } of secondRun) console.log(`     ${f}: ${msg}`);
ok(secondRun.length === 0,
   secondRun.length === 0
     ? `and every one of them a second time, immediately, against the schema it had just produced — a half-applied paste can be repaired by running the same paste again`
     : `${secondRun.length} of ${files.length} cannot be run twice: ${secondRun.map((x) => x.f).join(", ")}`);

// "No error" and "no damage" are different claims.
console.log("\nAnd running everything twice did no damage:");
const q = async (s) => (await db.query(s)).rows[0];
const dupPolicies = await q(`select count(*) c from (
  select tablename, policyname, count(*) n from pg_policies
   where schemaname='public' group by 1,2 having count(*) > 1) d`);
ok(Number(dupPolicies.c) === 0, `no policy exists twice (${dupPolicies.c})`);
const tenants = await q(`select count(*) c from public.tenants`);
ok(Number(tenants.c) === 1, `still exactly one business, not two (${tenants.c})`);
const plans = await q(`select count(*) c from (
  select tier, count(*) n from public.membership_plans group by 1 having count(*) > 1) d`);
ok(Number(plans.c) === 0, `the membership catalogue was not re-seeded (${plans.c} duplicated tiers)`);
const badges = await q(`select count(*) c from (
  select slug, count(*) n from public.badges group by 1 having count(*) > 1) d`);
ok(Number(badges.c) === 0, `nor the badge catalogue (${badges.c} duplicated slugs)`);
const revived = await q(`select count(*) c from pg_class k
  join pg_namespace n on n.oid = k.relnamespace
 where n.nspname = 'public' and k.relkind = 'r'
   and k.relname in ('platform_admins', 'tenant_invitations', 'tasks', 'workstreams', 'products')`);
ok(Number(revived.c) === 0,
   `and no table 0054 or 0055 removed came back (${revived.c}) — a second run of an earlier file must not resurrect one`);

console.log(`\n${state.pass} passed, ${state.fail} failed`);
process.exit(state.fail ? 1 : 0);
