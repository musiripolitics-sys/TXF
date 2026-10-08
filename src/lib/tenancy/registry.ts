import "server-only";
import { headers } from "next/headers";

/**
 * Which Supabase project does this request belong to.
 *
 * Stage A of supabase/tenancy/DATABASE-SPLIT.md. Nothing here changes
 * behaviour on its own: with no registry configured, every host resolves to
 * one connection built from the existing environment variables, which is
 * exactly what the app used before this file existed. That is the point of
 * doing routing first and the schema last — the destructive stage can be
 * deferred until this has been running for a while.
 *
 * Configuration, when there is more than one business:
 *
 *   TENANT_HOSTS = "techxfluence.com=txf,www.techxfluence.com=txf,rival.com=rival"
 *   TENANT_txf_URL          = https://....supabase.co
 *   TENANT_txf_ANON_KEY     = ...
 *   TENANT_txf_SERVICE_KEY  = ...
 *
 * Per-tenant variables rather than one JSON blob, so a service key is never
 * sitting in the same value as something that reaches the browser, and so a
 * hosting provider can mark them secret individually.
 */

export type TenantConnection = {
  /** Registry key. "default" when nothing is configured. */
  slug: string;
  url: string;
  anonKey: string;
  /** Null when this project has no service key configured. */
  serviceKey: string | null;
};

/** The single-project fallback: the environment the app already had. */
function fallback(): TenantConnection {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "No Supabase project configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY, or configure TENANT_HOSTS.",
    );
  }
  return {
    slug: "default",
    url,
    anonKey,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
  };
}

/**
 * host -> slug, from TENANT_HOSTS. Hosts are compared lower-cased and without
 * a port, because a request arrives as "techxfluence.com" in production and
 * "localhost:3000" in development, and the registry should not need both
 * spellings of every entry. A port in the configured host is honoured when it
 * is written, so "localhost:3000=txf" works too.
 */
export function tenantHosts(): Map<string, string> {
  const raw = process.env.TENANT_HOSTS?.trim();
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const pair of raw.split(",")) {
    const [host, slug] = pair.split("=").map((s) => s?.trim());
    if (!host || !slug) continue;
    map.set(host.toLowerCase(), slug);
  }
  return map;
}

/** Which business a host belongs to, or null when the registry does not say. */
export function resolveTenantSlug(host: string | null | undefined): string | null {
  const hosts = tenantHosts();
  if (hosts.size === 0 || !host) return null;
  const full = host.toLowerCase();
  return hosts.get(full) ?? hosts.get(full.split(":")[0]) ?? null;
}

/**
 * The connection for a slug. Throws rather than falling back to another
 * business: a misconfigured registry entry must not quietly serve one
 * company the wrong database.
 */
export function tenantConnection(slug: string): TenantConnection {
  const key = slug.replace(/[^A-Za-z0-9_]/g, "_");
  const url = process.env[`TENANT_${key}_URL`];
  const anonKey = process.env[`TENANT_${key}_ANON_KEY`];
  if (!url || !anonKey) {
    throw new Error(
      `Tenant "${slug}" is in TENANT_HOSTS but has no project configured. ` +
        `Set TENANT_${key}_URL and TENANT_${key}_ANON_KEY.`,
    );
  }
  return {
    slug,
    url,
    anonKey,
    serviceKey: process.env[`TENANT_${key}_SERVICE_KEY`] ?? null,
  };
}

/**
 * The connection for the request being handled.
 *
 * Reads the Host header, so it only works where a request exists — Server
 * Components, Server Actions, Route Handlers. The daily cron job and the
 * payment webhook have no meaningful host, which is why they take an explicit
 * slug instead (see connectionForSlug).
 */
export async function currentTenantConnection(): Promise<TenantConnection> {
  let host: string | null = null;
  try {
    const h = await headers();
    host = h.get("x-forwarded-host") ?? h.get("host");
  } catch {
    // No request in scope. Fall through to the single-project default, which
    // is correct until a second project exists.
  }
  const slug = resolveTenantSlug(host);
  return slug ? tenantConnection(slug) : fallback();
}

/**
 * The connection for a named business, for work that has no request behind
 * it. Falls back to the single project when the registry is empty, so the
 * cron job and the webhook keep working unchanged through Stage A.
 */
export function connectionForSlug(slug: string | null | undefined): TenantConnection {
  if (!slug || tenantHosts().size === 0) return fallback();
  return tenantConnection(slug);
}

/** Every business the registry knows about. Used by the Stage B runner. */
export function allTenantConnections(): TenantConnection[] {
  const slugs = [...new Set(tenantHosts().values())];
  return slugs.length === 0 ? [fallback()] : slugs.map(tenantConnection);
}
