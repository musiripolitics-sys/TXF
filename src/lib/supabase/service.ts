import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { connectionForSlug, currentTenantConnection } from "@/lib/tenancy/registry";

/**
 * A Supabase client holding the service role key.
 *
 * For writes that a client must not be able to make itself. Confirming a
 * payment is the one that matters: the policies on public.payments used to let
 * a signed-in person insert their own row with status 'paid' and any amount,
 * and update it afterwards, which meant the record of what was charged was
 * writable by whoever was being charged.
 *
 * The verification routes run server-side and check the Razorpay signature
 * before they write. Writing as the service role is what lets the client
 * policies be removed, which is migration 0048.
 *
 * Returns null when the key is absent, so a caller can fail loudly rather
 * than silently falling back to the user's own permissions.
 *
 * Takes an optional business slug for work with no request behind it — the
 * daily cron job and the payment webhook have no meaningful Host header. With
 * no registry configured both forms resolve to the single project the app
 * already used, so Stage A changes nothing here either.
 */
export function serviceClient(slug?: string | null) {
  const tenant = connectionForSlug(slug);
  if (!tenant.serviceKey) return null;
  return createSupabaseClient(tenant.url, tenant.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * The service client for the business this request belongs to. Prefer this in
 * a route handler or server action; serviceClient() is for the scheduled and
 * webhook paths that have to name their business explicitly.
 */
export async function requestServiceClient() {
  const tenant = await currentTenantConnection();
  if (!tenant.serviceKey) return null;
  return createSupabaseClient(tenant.url, tenant.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
