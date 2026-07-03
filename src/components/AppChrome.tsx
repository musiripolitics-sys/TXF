import { getUserRole, getCurrentUser } from "@/lib/auth";
import { Chrome } from "./Chrome";
import { Toaster } from "./Toast";

// Per-role brand accent. Applied as inline CSS variables on the app wrapper so
// the whole UI recolours (orange = member/default, green = host, blue = admin).
const roleTheme: Record<string, React.CSSProperties> = {
  host: {
    "--color-brand": "#16a34a",
    "--color-brand-soft": "#15803d",
    "--color-brand-ink": "#052e16",
  } as React.CSSProperties,
  admin: {
    "--color-brand": "#2563eb",
    "--color-brand-soft": "#1d4ed8",
    "--color-brand-ink": "#0a1f4d",
  } as React.CSSProperties,
  member: {},
};

/**
 * The auth-dependent shell. Lives inside a Suspense boundary in the root
 * layout so the document streams (and the boot loader paints) immediately
 * instead of blocking first paint on the auth round trip.
 */
export async function AppChrome({ children }: { children: React.ReactNode }) {
  const [role, user] = await Promise.all([getUserRole(), getCurrentUser()]);

  return (
    <div
      data-role={role}
      style={roleTheme[role]}
      className="flex min-h-screen flex-col"
    >
      <Chrome role={role} authed={!!user}>
        {children}
      </Chrome>
      <Toaster />
    </div>
  );
}

/** Full-screen boot loader shown while the shell resolves auth. */
export function BootFallback() {
  return (
    <div
      id="boot-skeleton"
      className="flex min-h-screen flex-col items-center justify-center gap-4"
    >
      <span className="animate-pulse font-display text-3xl font-bold tracking-tight text-fg">
        T<span className="text-brand">X</span>F
      </span>
      <span className="h-1 w-28 overflow-hidden rounded-full bg-ink-2">
        <span className="block h-full w-1/2 animate-[loader_1s_ease-in-out_infinite] rounded-full bg-brand" />
      </span>
    </div>
  );
}
