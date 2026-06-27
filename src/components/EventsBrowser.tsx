"use client";

import { useMemo, useState } from "react";
import { eventCategories, type EventCategory, type TXFEvent } from "@/lib/data";
import { EventRow } from "./EventRow";

export function EventsBrowser({ initialEvents }: { initialEvents: TXFEvent[] }) {
  const [allEvents] = useState<TXFEvent[]>(initialEvents);
  const [cats, setCats] = useState<EventCategory[]>([]);
  const [city, setCity] = useState<string>("All");
  const [price, setPrice] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"soon" | "later" | "free">("soon");

  const cities = useMemo(() => Array.from(new Set(allEvents.map((e) => e.city))), [allEvents]);

  const toggleCat = (c: EventCategory) =>
    setCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = allEvents.filter(
      (e) =>
        (cats.length === 0 || cats.includes(e.category)) &&
        (city === "All" || e.city === city) &&
        (price === "All" || e.price === price) &&
        (q === "" ||
          `${e.title} ${e.city} ${e.venue}`.toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) => {
      if (sort === "free") {
        if (a.price === b.price) return 0;
        return a.price === "Free" ? -1 : 1;
      }
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sort === "soon" ? da - db : db - da;
    });
  }, [allEvents, cats, city, price, search, sort]);

  const hasFilters =
    cats.length > 0 || city !== "All" || price !== "All" || search.trim() !== "";

  const clearAll = () => {
    setCats([]);
    setCity("All");
    setPrice("All");
    setSearch("");
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
        {/* ── Filter sidebar ── */}
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-fg">Filters</h2>
            {hasFilters && (
              <button
                onClick={clearAll}
                className="text-xs font-medium text-brand-soft hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <FilterPanel
              title="Categories"
              onClear={cats.length ? () => setCats([]) : undefined}
            >
              <div className="flex flex-wrap gap-2">
                {eventCategories.map((c) => (
                  <Chip
                    key={c}
                    active={cats.includes(c)}
                    onClick={() => toggleCat(c)}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
            </FilterPanel>

            <FilterPanel
              title="City"
              onClear={city !== "All" ? () => setCity("All") : undefined}
            >
              <div className="flex flex-wrap gap-2">
                <Chip active={city === "All"} onClick={() => setCity("All")}>
                  All
                </Chip>
                {cities.map((c) => (
                  <Chip key={c} active={city === c} onClick={() => setCity(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </FilterPanel>

            <FilterPanel
              title="Price"
              onClear={price !== "All" ? () => setPrice("All") : undefined}
            >
              <div className="flex flex-wrap gap-2">
                {["All", "Free", "Paid"].map((p) => (
                  <Chip key={p} active={price === p} onClick={() => setPrice(p)}>
                    {p}
                  </Chip>
                ))}
              </div>
            </FilterPanel>
          </div>
        </aside>

        {/* ── Results ── */}
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-fg">
              Events {city !== "All" ? `in ${city}` : "across India"}
            </h1>
            <span className="text-sm text-faint">
              {filtered.length} {filtered.length === 1 ? "event" : "events"}
            </span>
          </div>

          {/* Search + sort toolbar */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, city or venue…"
              aria-label="Search events"
              className="w-full flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Sort events"
              className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-fg focus:border-brand focus:outline-none"
            >
              <option value="soon">Soonest first</option>
              <option value="later">Latest first</option>
              <option value="free">Free first</option>
            </select>
          </div>

          {filtered.length > 0 ? (
            <div className="mt-8 flex flex-col gap-4">
              {filtered.map((event) => (
                <EventRow key={event.slug} event={event} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
              <p className="font-display text-lg text-fg">
                {hasFilters ? "No events match your filters." : "No events yet."}
              </p>
              <p className="mt-1 text-sm text-muted">
                {hasFilters
                  ? "Try adjusting or clearing them — new events drop every week."
                  : "Check back soon — new events drop every week."}
              </p>
              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPanel({
  title,
  onClear,
  children,
}: {
  title: string;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs font-medium text-brand-soft hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-brand text-white"
          : "border border-line text-muted hover:border-brand/50 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
