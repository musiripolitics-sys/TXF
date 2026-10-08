import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { currentTenantConnection } from "@/lib/tenancy/registry";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * `cookies()` is async in this Next.js version, so this must be awaited.
 *
 * Since Stage A of the database split, the project is resolved per request
 * from the Host header rather than read straight from the environment. With
 * no registry configured that resolves to the same single project as before,
 * so this is not a behaviour change until a second business exists.
 */
export async function createClient() {
  const [cookieStore, tenant] = await Promise.all([
    cookies(),
    currentTenantConnection(),
  ]);

  return createServerClient(
    tenant.url,
    tenant.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // is refreshing the session. Wire up middleware when adding auth.
          }
        },
      },
    },
  );
}
