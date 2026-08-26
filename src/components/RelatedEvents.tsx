import Link from "next/link";
import { EventCard } from "@/components/EventCard";
import type { TXFEvent } from "@/lib/data";

/**
 * Somewhere to go that isn't the back button. Prefers the same category, then
 * the same city, then anything upcoming.
 */
export function RelatedEvents({
  current,
  all,
}: {
  current: TXFEvent;
  all: TXFEvent[];
}) {
  const others = all.filter((e) => e.slug !== current.slug);
  if (others.length === 0) return null;

  const score = (e: TXFEvent) =>
    (e.category === current.category ? 2 : 0) + (e.city === current.city ? 1 : 0);

  const picks = [...others]
    .sort((a, b) => score(b) - score(a) || a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <section className="border-t border-line bg-surface-2/40">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-bold tracking-tight text-fg">
            You might also like
          </h2>
          <Link href="/events" className="text-sm font-medium text-brand-soft hover:underline">
            All events →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      </div>
    </section>
  );
}
