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
  "/ambassador",
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

  // TXF Tech Services is a separate studio site with its own header and
  // footer (components/techservice), not part of the community chrome.
  if (pathname === "/Techservice" || pathname.startsWith("/Techservice/")) {
    return <>{children}</>;
  }

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
