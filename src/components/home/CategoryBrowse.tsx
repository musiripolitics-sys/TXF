import Link from "next/link";
import { Section, SectionHeading } from "@/components/Section";
import { Icon } from "@/components/Icon";
import { eventCategories, categoryTheme } from "@/lib/data";

/**
 * Marketplace-style "browse by category" tiles. Each links into the events
 * page with that category pre-filtered, using the per-category gradient.
 */
export function CategoryBrowse() {
  return (
    <Section id="browse">
      <SectionHeading
        align="left"
        eyebrow="Browse"
        title="Find your kind of event"
        description="Meetups, workshops, hackathons and more — jump straight to what you're into."
      />

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {eventCategories.map((cat) => {
          const t = categoryTheme[cat];
          return (
            <Link
              key={cat}
              href={`/events?category=${encodeURIComponent(cat)}`}
              className="group relative flex h-28 flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-soft transition-transform duration-300 hover:-translate-y-1"
              style={{ backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
            >
              <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
              <Icon name={t.icon} className="relative h-6 w-6 text-white/90" strokeWidth={1.6} />
              <span className="relative font-display text-sm font-bold text-white">
                {cat}
              </span>
              <span
                className="absolute right-3 top-3 text-white/70 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden
              >
                →
              </span>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
