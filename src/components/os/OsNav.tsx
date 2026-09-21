"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { OS_SECTIONS } from "@/lib/os-modules";

/**
 * Sectioned module navigation for the Business OS. Collapses to the active
 * section's row on small screens (with a toggle to reveal everything), and
 * shows all groups on wide screens. Sits under the AppShell top bar.
 */
export function OsNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const isActive = (href: string) =>
    href === "/admin/os" ? pathname === "/admin/os" : pathname === href || pathname.startsWith(href + "/");

  const activeSection = OS_SECTIONS.find((s) => s.items.some((i) => isActive(i.href)));

  const Pill = ({ href, label, icon }: { href: string; label: string; icon: string }) => (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive(href) ? "bg-brand text-white" : "text-muted hover:bg-surface hover:text-fg"
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </Link>
  );

  return (
    <nav className="-mx-5 mb-6 border-b border-line bg-ink/80 px-5 pb-3 pt-2 backdrop-blur md:-mx-8 md:px-8">
      {/* Mobile: active section + toggle */}
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <div className="flex gap-1 overflow-x-auto">
          {(activeSection ?? OS_SECTIONS[0]).items.map((it) => (
            <Pill key={it.href} {...it} />
          ))}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted"
        >
          {expanded ? "Less" : "All"}
        </button>
      </div>

      {/* All sections: always on desktop, toggle on mobile */}
      <div className={`${expanded ? "block" : "hidden"} space-y-2 lg:block`}>
        <div className="flex flex-col gap-2 pt-2 lg:pt-0">
          {OS_SECTIONS.map((section) => (
            <div key={section.label} className="flex flex-wrap items-center gap-1.5">
              <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-faint">
                {section.label}
              </span>
              {section.items.map((it) => (
                <Pill key={it.href} {...it} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
