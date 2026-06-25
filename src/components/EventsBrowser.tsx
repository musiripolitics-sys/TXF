"use client";

import { useMemo, useState } from "react";
import { events, eventCategories, type EventCategory } from "@/lib/data";
import { EventRow } from "./EventRow";

const cities = Array.from(new Set(events.map((e) => e.city)));

export function EventsBrowser() {
  const [cats, setCats] = useState<EventCategory[]>([]);
  const [city, setCity] = useState<string>("All");
  const [price, setPrice] = useState<string>("All");

  const toggleCat = (c: EventCategory) =>
    setCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (cats.length === 0 || cats.includes(e.category)) &&
          (city === "All" || e.city === city) &&
          (price === "All" || e.price === price),
      ),
    [cats, city, price],
  );

  const hasFilters = cats.length > 0 || city !== "All" || price !== "All";

  const clearAll = () => {
    setCats([]);
    setCity("All");
    setPrice("All");
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

          {/* Quick category chips */}
          <div className="mt-5 flex flex-wrap gap-2">
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

          {filtered.length > 0 ? (
            <div className="mt-8 flex flex-col gap-4">
              {filtered.map((event) => (
                <EventRow key={event.slug} event={event} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
              <p className="font-display text-lg text-fg">No events match.</p>
              <p className="mt-1 text-sm text-muted">
                Try clearing a filter — new events drop every week.
              </p>
              <button
                onClick={clearAll}
                className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft"
              >
                Clear filters
              </button>
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
