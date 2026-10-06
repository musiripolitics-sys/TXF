import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
 */
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
