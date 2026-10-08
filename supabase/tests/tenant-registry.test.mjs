/**
 * Which database serves which business.
 *
 * Stage A of the database split. This is the highest-consequence function in
 * the project: getting resolveTenantSlug wrong serves one company another
 * company's data, and no row-level policy can save you from it once the
 * policies live in different databases.
 *
 * The module is bundled with esbuild first, because it is TypeScript and
 * imports next/headers and server-only. Both are stubbed, which is the same
 * approach npm run test:email already uses.
 */
import { execFileSync } from "node:child_process";
import fs from "fs";

const OUT = ".tmp/tenancy-registry.mjs";
fs.mkdirSync(".tmp", { recursive: true });
execFileSync("npx", [
  "esbuild", "src/lib/tenancy/registry.ts",
  "--bundle", "--format=esm", "--platform=node", `--outfile=${OUT}`,
  "--alias:server-only=./scripts/server-only-stub.mjs",
  "--alias:next/headers=./scripts/next-headers-stub.mjs",
  "--log-level=error",
], { stdio: "inherit" });

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log("  ✅ " + m)) : (fail++, console.log("  ❌ " + m)); };

// A fresh import per scenario, because the registry reads process.env at call
// time but Node caches the module; a query string makes each import distinct.
let n = 0;
const load = async (env) => {
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("TENANT_") || k === "TEST_HOST") delete process.env[k];
  }
  Object.assign(process.env, env);
  return import(`../../${OUT}?v=${++n}`);
};

const BASE = {
  NEXT_PUBLIC_SUPABASE_URL: "https://shared.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "shared-anon",
  SUPABASE_SERVICE_ROLE_KEY: "shared-service",
};
Object.assign(process.env, BASE);

console.log("\nWith no registry configured, nothing changes:");
{
  const m = await load({});
  ok(m.tenantHosts().size === 0, "the host map is empty");
  ok(m.resolveTenantSlug("techxfluence.com") === null, "no host resolves to a business");
  const c = m.connectionForSlug(null);
  ok(c.url === "https://shared.supabase.co" && c.slug === "default",
     `the fallback is the project the app already had (${c.slug})`);
  ok(c.serviceKey === "shared-service", "including its service key");
  const r = await m.currentTenantConnection();
  ok(r.url === "https://shared.supabase.co",
     "and a request resolves there too, which is what makes Stage A a no-op");
  // Even a slug that means nothing resolves to the single project, because
  // with one database there is nothing else it could mean.
  ok(m.connectionForSlug("whatever").url === "https://shared.supabase.co",
     "a named business is ignored while the registry is empty");
}

console.log("\nWith a registry, a host picks a project:");
const TWO = {
  TENANT_HOSTS: "techxfluence.com=txf,www.techxfluence.com=txf,rival.com=rival",
  TENANT_txf_URL: "https://txf.supabase.co",
  TENANT_txf_ANON_KEY: "txf-anon",
  TENANT_txf_SERVICE_KEY: "txf-service",
  TENANT_rival_URL: "https://rival.supabase.co",
  TENANT_rival_ANON_KEY: "rival-anon",
};
{
  const m = await load(TWO);
  ok(m.tenantHosts().size === 3, `three hosts registered (${m.tenantHosts().size})`);
  ok(m.resolveTenantSlug("techxfluence.com") === "txf", "the apex domain");
  ok(m.resolveTenantSlug("www.techxfluence.com") === "txf", "and its www form");
  ok(m.resolveTenantSlug("rival.com") === "rival", "a different business");
  ok(m.resolveTenantSlug("TECHXFLUENCE.COM") === "txf", "matching is case-insensitive");
  ok(m.resolveTenantSlug("techxfluence.com:3000") === "txf",
     "a port is stripped, so one entry covers production and a local proxy");
  ok(m.resolveTenantSlug("someoneelse.com") === null,
     "an unregistered host resolves to nothing rather than to the first business");
  ok(m.resolveTenantSlug(null) === null, "and so does a missing host");
}

console.log("\nThe connection carries that project's own keys:");
{
  const m = await load(TWO);
  const txf = m.tenantConnection("txf");
  const rival = m.tenantConnection("rival");
  ok(txf.url === "https://txf.supabase.co" && txf.anonKey === "txf-anon", "Techxfluence gets its own");
  ok(rival.url === "https://rival.supabase.co", "and the other business gets its own");
  ok(txf.url !== rival.url && txf.anonKey !== rival.anonKey,
     "no value is shared between them — which is the whole point of the split");
  ok(rival.serviceKey === null,
     "a project with no service key configured reports null rather than borrowing another project's");
}

console.log("\nA misconfigured entry fails loudly instead of serving the wrong data:");
{
  const m = await load({ ...TWO, TENANT_HOSTS: TWO.TENANT_HOSTS + ",third.com=third" });
  let err = null;
  try { m.tenantConnection("third"); } catch (e) { err = e.message; }
  ok(err !== null && err.includes("third") && err.includes("TENANT_third_URL"),
     `a host pointing at an unconfigured project throws, and names what is missing (${(err ?? "").slice(0, 72)})`);
  ok(m.resolveTenantSlug("third.com") === "third",
     "the host still resolves, so the failure is a configuration error rather than a silent fallback");
}

console.log("\nThe request resolves by Host header:");
{
  const m = await load({ ...TWO, TEST_HOST: "rival.com" });
  const c = await m.currentTenantConnection();
  ok(c.slug === "rival" && c.url === "https://rival.supabase.co",
     `a request for rival.com reaches rival's database (${c.slug})`);
}
{
  const m = await load({ ...TWO, TEST_HOST: "techxfluence.com" });
  const c = await m.currentTenantConnection();
  ok(c.slug === "txf", "and one for techxfluence.com reaches Techxfluence's");
}
{
  // No TEST_HOST: headers() throws, as it does in the cron job and webhook.
  const m = await load(TWO);
  const c = await m.currentTenantConnection();
  ok(c.slug === "default",
     "outside a request it falls back rather than throwing — the cron job and the payment webhook have no Host header, and Stage C gives them an explicit slug");
}

console.log("\nEvery business is enumerable, for the Stage B migration runner:");
{
  const m = await load(TWO);
  const all = m.allTenantConnections();
  ok(all.length === 2, `two distinct projects, not three hosts (${all.length})`);
  ok(all.map((c) => c.slug).sort().join(",") === "rival,txf", "listed by slug");
  const one = await load({});
  ok(one.allTenantConnections().length === 1,
     "and with no registry it is the single project, so the runner works before any split happens");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
