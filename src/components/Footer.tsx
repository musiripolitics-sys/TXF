import Link from "next/link";
import { Logo } from "./Logo";
import { Newsletter } from "./Newsletter";
import { brand } from "@/lib/data";

const columns = [
  {
    title: "Platform",
    links: [
      { label: "Events", href: "/events" },
      { label: "Membership", href: "/membership" },
      { label: "Host an Event", href: "/host" },
      { label: "Activities", href: "/#activities" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Leaders", href: "/leaders" },
      { label: "Partners", href: "/#partners" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/legal/terms" },
      { label: "Organizer Agreement", href: "/legal/organizer-agreement" },
      { label: "Membership Handbook", href: "/legal/handbook" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink-2">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="mb-12 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h3 className="font-display text-xl font-semibold text-fg">
              Stay in the loop
            </h3>
            <p className="mt-1 text-sm text-muted">
              Upcoming events, opportunities and resources — once a month.
            </p>
          </div>
          <Newsletter compact />
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo withTagline />
            <p className="mt-4 max-w-xs text-sm text-muted">
              {brand.tagline}. A technology community and event ecosystem —
              building India&apos;s tech tribe together.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {brand.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand hover:text-brand"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-fg"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-xs text-faint sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
          <p>
            {brand.location} · {brand.email}
          </p>
        </div>
      </div>
    </footer>
  );
}
