/**
 * The site's content is in the database, and running the seed twice does not
 * double it.
 *
 * This matters more than a seed test usually would. lib/content.ts used to
 * fall back to hardcoded arrays whenever one of these tables came back empty,
 * and every one of them was empty — so the live site served ten leaders,
 * three priced tiers and eight perks that existed only in a TypeScript file.
 * Removing those fallbacks made these rows load-bearing: with no rows,
 * /membership has no plans to sell.
 *
 * So this asserts the counts the live site has, by name where a name is the
 * thing that would silently go missing.
 */
import { freshDb, counter, applyMigration } from "./_db.mjs";

const { state, ok } = counter();
const { db, skipped } = await freshDb();
ok(skipped.length === 0, `every migration applied cleanly (${skipped.length} failures)`);

const q = async (s) => (await db.query(s)).rows;
const n = async (s) => Number((await q(s))[0].c);

console.log("\nThe content is there:");
for (const [table, expected] of [
  ["leader_profiles", 10],
  ["activities", 6],
  ["benefits", 8],
  ["membership_plans", 3],
  ["plan_benefits", 14],
]) {
  const got = await n(`select count(*) c from public.${table}`);
  ok(got === expected, `${table}: ${got} rows (expected ${expected})`);
}

console.log("\nAnd it is the content the site actually sells:");
const plans = await q(`select tier, name, price_amount, is_highlight from public.membership_plans order by sort_order`);
ok(plans.length === 3 && plans.map((p) => p.tier).join(",") === "Free,Pro,Elite",
   `three tiers in order: ${plans.map((p) => `${p.tier} ₹${p.price_amount / 100}`).join(", ")}`);
ok(plans.find((p) => p.tier === "Pro")?.price_amount === 49900, "Pro is ₹499, the price member_discount_pct is written against");
ok(plans.filter((p) => p.is_highlight).length === 1, "exactly one tier is highlighted");

const orphanPerks = await n(`select count(*) c from public.plan_benefits b
  left join public.membership_plans p on p.id = b.plan_id where p.id is null`);
ok(orphanPerks === 0, `no perk is attached to a plan that does not exist (${orphanPerks})`);
const planless = await q(`select p.tier from public.membership_plans p
  where not exists (select 1 from public.plan_benefits b where b.plan_id = p.id)`);
ok(planless.length === 0, `every tier has perks (${planless.map((p) => p.tier).join(", ") || "all do"})`);

// partners is deliberately NOT seeded: an empty marquee is honest, an
// invented partner is not.
ok(await n(`select count(*) c from public.partners`) === 0,
   "partners is left empty on purpose — a seed must not invent a partner");

console.log("\nRunning the seed again changes nothing:");
const before = await Promise.all(["leader_profiles", "activities", "benefits", "membership_plans", "plan_benefits"]
  .map((t) => n(`select count(*) c from public.${t}`)));
await applyMigration(db, "0057_seed_site_content.sql");
const after = await Promise.all(["leader_profiles", "activities", "benefits", "membership_plans", "plan_benefits"]
  .map((t) => n(`select count(*) c from public.${t}`)));
ok(before.join(",") === after.join(","),
   `the same row counts after a second run (${before.join("/")} → ${after.join("/")})`);

// The guard is on a natural key, so an edited row must survive a re-run.
await db.exec(`update public.membership_plans set name = 'Pro (renamed by hand)' where tier = 'Pro';`);
await applyMigration(db, "0057_seed_site_content.sql");
const renamed = (await q(`select name from public.membership_plans where tier = 'Pro'`))[0].name;
ok(renamed === "Pro (renamed by hand)",
   `and an edit made in the database is not overwritten by it (${renamed})`);

console.log(`\n${state.pass} passed, ${state.fail} failed`);
process.exit(state.fail ? 1 : 0);
