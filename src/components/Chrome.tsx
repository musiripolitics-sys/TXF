"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

type Role = "member" | "host" | "admin";

// Authenticated, functional areas get the app-shell (sidebar). Everything else
// (marketing / funnel) keeps the website chrome (top nav + footer).
const APP_PREFIXES = [
  "/community",
  "/directory",
  "/profile",
  "/admin",
  "/host/dashboard",
  "/host/checkin",
  "/account",
  "/events", // browse + event detail stay in-app when signed in
];

export function Chrome({
  role,
  authed,
  children,
}: {
  role: Role;
  authed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isApp =
    authed && APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));

  if (isApp) {
    return <AppShell role={role}>{children}</AppShell>;
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
