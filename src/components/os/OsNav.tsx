"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { OS_NAV } from "@/lib/bos";

/**
 * Horizontal, scrollable sub-navigation for the Business OS. Sits under the
 * AppShell top bar (which already provides the admin sidebar + blue theme).
 * Kept as tabs rather than a second sidebar so the module reads as one screen.
 */
export function OsNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin/os"
      ? pathname === "/admin/os"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="sticky top-0 z-10 -mx-5 mb-6 border-b border-line bg-ink/80 px-5 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex gap-1 overflow-x-auto py-2">
        {OS_NAV.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand text-white"
                  : "text-muted hover:bg-surface hover:text-fg"
              }`}
            >
              <Icon name={it.icon} className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
