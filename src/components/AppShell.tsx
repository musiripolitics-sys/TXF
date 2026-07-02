"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { NotificationBell } from "./NotificationBell";
import { createClient } from "@/lib/supabase/client";

type Role = "member" | "host" | "admin";
type NavItem = { href: string; label: string; icon: string };

const primary: NavItem[] = [
  { href: "/community", label: "Community", icon: "broadcast" },
  { href: "/directory", label: "Directory", icon: "users" },
  { href: "/profile", label: "My Tickets", icon: "ticket" },
  { href: "/events", label: "Browse Events", icon: "calendar" },
];

const hostItems: NavItem[] = [
  { href: "/host/dashboard", label: "My Events", icon: "mic" },
  { href: "/host/checkin", label: "Check-in", icon: "check" },
];

const adminItems: NavItem[] = [
  { href: "/admin", label: "Console", icon: "sparkle" },
];

export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Current section title, derived from the nav item whose href best matches.
  const titleMap: { href: string; label: string }[] = [
    ...primary,
    ...hostItems,
    ...adminItems,
    { href: "/profile/edit", label: "Settings" },
    { href: "/account", label: "Account" },
  ];
  const title =
    titleMap
      .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Techxfluence";

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const Group = ({ title, items }: { title?: string; items: NavItem[] }) => (
    <div className="space-y-1">
      {title && (
        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-faint">
          {title}
        </p>
      )}
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand/10 text-brand-soft"
                : "text-muted hover:bg-ink-2 hover:text-fg"
            }`}
          >
            <Icon name={it.icon} className="h-5 w-5 shrink-0" />
            {it.label}
          </Link>
        );
      })}
    </div>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <Group items={primary} />
        {(role === "host" || role === "admin") && (
          <Group title="Hosting" items={hostItems} />
        )}
        {role === "admin" && <Group title="Admin" items={adminItems} />}
      </nav>

      <div className="border-t border-line px-3 py-3">
        <Link
          href="/profile/edit"
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname.startsWith("/profile/edit") ? "bg-brand/10 text-brand-soft" : "text-muted hover:bg-ink-2 hover:text-fg"
          }`}
        >
          <Icon name="settings" className="h-5 w-5 shrink-0" />
          Settings
        </Link>
        <button
          onClick={signOut}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-ink-2 hover:text-fg"
        >
          <Icon name="logout" className="h-5 w-5 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-surface shadow-xl">{sidebar}</div>
        </div>
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop top bar */}
        <header className="sticky top-0 z-20 hidden items-center justify-between border-b border-line bg-surface/80 px-8 py-4 backdrop-blur lg:flex">
          <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/" className="text-sm text-muted transition-colors hover:text-fg">
              View public site ↗
            </Link>
          </div>
        </header>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-lg border border-line p-2 text-fg"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <Logo />
          <NotificationBell />
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
