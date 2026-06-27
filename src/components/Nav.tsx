"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const links = [
  { label: "Events", href: "/events" },
  { label: "Community", href: "/community" },
  { label: "Membership", href: "/membership" },
  { label: "Host an Event", href: "/host" },
  { label: "Leaders", href: "/leaders" },
  { label: "Careers", href: "/careers" },
  { label: "About", href: "/about" },
];

type AppRole = "admin" | "host" | "member";

const roleMeta: Record<AppRole, { label: string; dash?: { href: string; label: string } }> = {
  admin: { label: "Admin", dash: { href: "/admin", label: "Console" } },
  host: { label: "Host", dash: { href: "/host/dashboard", label: "My Events" } },
  member: { label: "Member" },
};

export function Nav({ role = "member" }: { role?: AppRole }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-line bg-ink/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand-soft">
                {roleMeta[role].label}
              </span>
              <Button href="/profile" variant="ghost" size="sm">
                Profile
              </Button>
              {roleMeta[role].dash && (
                <Button href={roleMeta[role].dash!.href} variant="ghost" size="sm">
                  {roleMeta[role].dash!.label}
                </Button>
              )}
              <button
                onClick={handleSignOut}
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-muted hover:text-fg hover:border-fg transition-all duration-200 cursor-pointer"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Button href="/login" variant="ghost" size="sm">
                Sign in
              </Button>
              <Button href="/events" variant="brand" size="sm">
                Join Events
              </Button>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-fg md:hidden"
        >
          <div className="space-y-1.5">
            <span
              className={`block h-0.5 w-5 bg-current transition-transform ${
                open ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 bg-current transition-opacity ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 bg-current transition-transform ${
                open ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-ink px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-surface hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {user ? (
              <>
                <Button href="/profile" variant="outline" size="md" className="w-full">
                  Profile
                </Button>
                {roleMeta[role].dash && (
                  <Button
                    href={roleMeta[role].dash!.href}
                    variant="brand"
                    size="md"
                    className="w-full"
                  >
                    {roleMeta[role].dash!.label}
                  </Button>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full rounded-full border border-line bg-surface py-2.5 text-center text-sm font-medium text-muted hover:text-fg hover:border-fg transition-all duration-200 cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Button href="/events" variant="brand" size="md" className="w-full">
                  Join Events
                </Button>
                <Button href="/login" variant="outline" size="md" className="w-full">
                  Sign in
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
