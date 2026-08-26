import { Suspense } from "react";
import type { Metadata } from "next";
import { EventsBrowser } from "@/components/EventsBrowser";
import { getEvents } from "@/lib/events";
import {
  fromParams,
  toParams,
  activeDimensions,
  WHEN_LABELS,
  FORMAT_LABELS,
} from "@/lib/event-filters";

type SP = Promise<Record<string, string | string[] | undefined>>;

function toURLSearchParams(sp: Record<string, string | string[] | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") p.set(k, v);
    else if (Array.isArray(v) && v[0]) p.set(k, v[0]);
  }
  return p;
}

/**
 * A single-filter view is a real page worth ranking — "Workshops", "Events in
 * Chennai". Anything more specific is a filter combination, and letting Google
 * index those produces thousands of near-identical near-empty pages, so they
 * are canonicalised back to /events and marked noindex.
 */
export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = fromParams(toURLSearchParams(await searchParams));
  const dims = activeDimensions(f);

  const base = "Browse and filter upcoming Techxfluence tech events by date, category, city, format and price.";
  if (dims.length === 0) {
    return { title: "Events", description: base, alternates: { canonical: "/events" } };
  }

  if (dims.length === 1) {
    const d = dims[0];
    let title: string | null = null;
    if (d === "city") title = `Tech events in ${f.city}`;
    else if (d === "cats" && f.cats.length === 1) title = `${f.cats[0]} events`;
    else if (d === "format") title = `${FORMAT_LABELS[f.format as keyof typeof FORMAT_LABELS]} tech events`;
    else if (d === "when") title = `Tech events ${WHEN_LABELS[f.when as keyof typeof WHEN_LABELS]?.toLowerCase()}`;
    else if (d === "price") title = f.price === "Free" ? "Free tech events" : "Paid tech events";

    if (title) {
      const qs = toParams(f).toString();
      return {
        title,
        description: `${title} from Techxfluence. ${base}`,
        alternates: { canonical: qs ? `/events?${qs}` : "/events" },
      };
    }
  }

  return {
    title: "Events",
    description: base,
    alternates: { canonical: "/events" },
    robots: { index: false, follow: true },
  };
}

export default async function EventsPage() {
  const events = await getEvents();
  // Filters live in the query string and are read client-side, so the browser
  // needs a boundary while the params resolve.
  return (
    <Suspense fallback={null}>
      <EventsBrowser initialEvents={events} />
    </Suspense>
  );
}
