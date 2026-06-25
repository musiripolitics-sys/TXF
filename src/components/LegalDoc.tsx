import Link from "next/link";
import type { LegalDoc } from "@/lib/legal";

const related = [
  { slug: "terms", label: "Terms & Conditions", href: "/legal/terms" },
  { slug: "handbook", label: "Membership Handbook", href: "/legal/handbook" },
  {
    slug: "organizer-agreement",
    label: "Organizer Agreement",
    href: "/legal/organizer-agreement",
  },
];

export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <nav className="flex flex-wrap gap-2">
        {related.map((r) => (
          <Link
            key={r.slug}
            href={r.href}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              r.slug === doc.slug
                ? "bg-brand text-white"
                : "border border-line text-muted hover:text-fg"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      <header className="mt-8 border-b border-line pb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-faint">
          {doc.updated}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          {doc.title}
        </h1>
        <p className="mt-4 text-muted">{doc.intro}</p>
      </header>

      <div className="mt-8 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-lg font-semibold text-fg">
              {s.heading}
            </h2>
            <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
          </section>
        ))}
      </div>

      <footer className="mt-12 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
        Questions? Reach the Techxfluence support team at{" "}
        <a href="mailto:hello@techxfluence.com" className="text-brand-soft underline">
          hello@techxfluence.com
        </a>
        .
      </footer>
    </div>
  );
}
