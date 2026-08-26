import Link from "next/link";
import { Section, SectionHeading } from "@/components/Section";
import { Icon } from "@/components/Icon";
import { eventCategories, categoryTheme } from "@/lib/data";

/**
 * Browse-by-category rows. Each links into the events page with that
 * category pre-filtered.
 *
 * The palette is deliberately restrained: the site runs one orange accent on
 * warm white, so a category's colour appears only in its icon chip rather than
 * as a full-bleed gradient. That keeps the per-category cue people scan for —
 * and which EventCard reuses — without seven saturated tiles competing with
 * the brand. A trailing "All events" row completes the 4x2 grid.
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

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {eventCategories.map((cat) => {
          const t = categoryTheme[cat];
          return (
            <Link
              key={cat}
              href={`/events?category=${encodeURIComponent(cat)}`}
              className="group flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/45 hover:shadow-[0_10px_24px_-16px_rgba(0,0,0,0.3)]"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-105"
                style={{
                  backgroundColor: `color-mix(in srgb, ${t.from} 14%, transparent)`,
                  color: t.to,
                }}
              >
                <Icon name={t.icon} className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>

              <span className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold text-fg transition-colors group-hover:text-brand-soft">
                {cat}
              </span>

              <span
                className="shrink-0 text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
                aria-hidden
              >
                →
              </span>
            </Link>
          );
        })}

        {/* Completes the grid and gives the row a terminal action. */}
        <Link
          href="/events"
          className="group flex items-center gap-3.5 rounded-xl border border-dashed border-brand/35 bg-brand/[0.04] px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/60 hover:bg-brand/[0.07]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand-soft transition-transform duration-200 group-hover:scale-105">
            <Icon name="calendar" className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold text-brand-soft">
            All events
          </span>
          <span
            className="shrink-0 text-brand/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
            aria-hidden
          >
            →
          </span>
        </Link>
      </div>
    </Section>
  );
}
