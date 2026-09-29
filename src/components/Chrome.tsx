"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

type Role = "member" | "host" | "employee" | "ambassador" | "admin";

// Authenticated, functional areas get the app-shell (sidebar). Everything else
// (marketing / funnel) keeps the website chrome (top nav + footer).
const APP_PREFIXES = [
  "/community",
  "/directory",
  "/profile",
  "/admin",
  "/workspace",
  "/ambassador",
  "/host/dashboard",
  "/host/checkin",
  "/account",
  "/events", // browse + event detail stay in-app when signed in
];

export function Chrome({
  role,
  hasOsAccess = false,
  authed,
  children,
}: {
  role: Role;
  /** True when this person has at least one Business OS section. */
  hasOsAccess?: boolean;
  authed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // The Business OS ships its own full-height shell. Wrapping it in AppShell
  // too gave it two competing navigations stacked on top of each other, which
  // is most of why it was hard to move around in.
  if (pathname === "/admin/os" || pathname.startsWith("/admin/os/")) {
    return <>{children}</>;
  }

  const isApp =
    authed && APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));

  if (isApp) {
    return (
      <AppShell role={role} hasOsAccess={hasOsAccess}>
        {children}
      </AppShell>
    );
  }

  return (
    <>
      <Nav role={role} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
