"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { eventCategories, type EventCategory, type TXFEvent } from "@/lib/data";
import { EventCard } from "./EventCard";
import {
  applyFilters,
  matches,
  fromParams,
  toParams,
  activeDimensions,
  clearDimension,
  bestRecovery,
  eventTags,
  hasFilters as anyFilters,
  WHEN_LABELS,
  FORMAT_LABELS,
  DIMENSION_LABELS,
  EMPTY,
  type Dimension,
  type Filters,
  type Sort,
} from "@/lib/event-filters";

export function EventsBrowser({ initialEvents }: { initialEvents: TXFEvent[] }) {
  const params = useSearchParams();

  // The URL is the source of truth, so the back button and shared links work
  // without any extra bookkeeping.
  const filters = useMemo(
    () => fromParams(new URLSearchParams(params.toString())),
    [params],
  );

  /**
   * Filtering is entirely client-side, so the URL is updated with the native
   * History API rather than router.replace — which would fire a server
   * navigation on every chip click. Next syncs pushState/replaceState back
   * into useSearchParams, so the read path above still drives everything.
   *
   * pushState for deliberate changes (back button undoes one filter);
   * replaceState for the search box, so typing doesn't bury the history.
   */
  const setFilters = useCallback((next: Filters, replace = false) => {
    const qs = toParams(next).toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }, []);

  // The search box types faster than we want history entries, so it keeps its
  // own state and pushes to the URL once typing settles.
  const [draft, setDraft] = useState(filters.q);
  const typing = useRef(false);
  useEffect(() => {
    if (!typing.current) setDraft(filters.q);
  }, [filters.q]);
  useEffect(() => {
    if (!typing.current) return;
    const t = setTimeout(() => {
      typing.current = false;
      if (draft !== filters.q) setFilters({ ...filters, q: draft }, true);
    }, 250);
    return () => clearTimeout(t);
  }, [draft, filters, setFilters]);

  const events = initialEvents;
  const results = useMemo(() => applyFilters(events, filters), [events, filters]);

  const cities = useMemo(
    () => Array.from(new Set(events.map((e) => e.city))).sort(),
    [events],
  );
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      for (const t of eventTags(e)) {
        counts.set(t.toLowerCase(), (counts.get(t.toLowerCase()) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [events]);

  /**
   * How many events a facet would return if you clicked it — every other
   * filter still applied. This is what stops the page offering choices that
   * lead nowhere.
   */
  const countIf = useCallback(
    (dimension: Dimension, patch: Partial<Filters>) => {
      const probe = { ...filters, ...patch };
      return events.filter((e) => matches(e, probe, undefined)).length;
    },
    [events, filters],
  );

  const active = activeDimensions(filters);
  const hasFilters = anyFilters(filters);
  const recovery = useMemo(
    () => (results.length === 0 ? bestRecovery(events, filters) : null),
    [results.length, events, filters],
  );

  const toggleCat = (c: EventCategory) =>
    setFilters({
      ...filters,
      cats: filters.cats.includes(c)
        ? filters.cats.filter((x) => x !== c)
        : [...filters.cats, c],
    });

  const toggleTag = (t: string) =>
    setFilters({
      ...filters,
      tags: filters.tags.includes(t)
        ? filters.tags.filter((x) => x !== t)
        : [...filters.tags, t],
    });

  const clearAll = () => {
    setDraft("");
    setFilters(EMPTY);
  };

  const heading =
    filters.city !== "all"
      ? `Events in ${filters.city}`
      : filters.format === "online"
        ? "Online events"
        : "Events across India";

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
        {/* ── Filters ── */}
        <aside className="min-w-0 lg:sticky lg:top-20 lg:h-fit">
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
              title="When"
              onClear={filters.when !== "all" ? () => setFilters({ ...filters, when: "all" }) : undefined}
            >
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={filters.when === "all"}
                  onClick={() => setFilters({ ...filters, when: "all" })}
                >
                  Any date
                </Chip>
                {(Object.keys(WHEN_LABELS) as (keyof typeof WHEN_LABELS)[]).map((w) => {
                  const n = countIf("when", { when: w });
                  return (
                    <Chip
                      key={w}
                      active={filters.when === w}
                      disabled={n === 0 && filters.when !== w}
                      count={n}
                      onClick={() => setFilters({ ...filters, when: w })}
                    >
                      {WHEN_LABELS[w]}
                    </Chip>
                  );
                })}
              </div>
            </FilterPanel>

            <FilterPanel
              title="Categories"
              onClear={filters.cats.length ? () => setFilters({ ...filters, cats: [] }) : undefined}
            >
              <div className="flex flex-wrap gap-2">
                {eventCategories.map((c) => {
                  const on = filters.cats.includes(c);
                  const n = countIf("cats", {
                    cats: on ? filters.cats.filter((x) => x !== c) : [...filters.cats, c],
                  });
                  return (
                    <Chip
                      key={c}
                      active={on}
                      disabled={n === 0 && !on}
                      count={n}
                      onClick={() => toggleCat(c)}
                    >
                      {c}
                    </Chip>
                  );
                })}
              </div>
            </FilterPanel>

            <FilterPanel
              title="Format"
              onClear={filters.format !== "all" ? () => setFilters({ ...filters, format: "all" }) : undefined}
            >
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={filters.format === "all"}
                  onClick={() => setFilters({ ...filters, format: "all" })}
                >
                  Any
                </Chip>
                {(Object.keys(FORMAT_LABELS) as (keyof typeof FORMAT_LABELS)[]).map((k) => {
                  const n = countIf("format", { format: k });
                  return (
                    <Chip
                      key={k}
                      active={filters.format === k}
                      disabled={n === 0 && filters.format !== k}
                      count={n}
                      onClick={() => setFilters({ ...filters, format: k })}
                    >
                      {FORMAT_LABELS[k]}
                    </Chip>
                  );
                })}
              </div>
            </FilterPanel>

            <FilterPanel
              title="City"
              onClear={filters.city !== "all" ? () => setFilters({ ...filters, city: "all" }) : undefined}
            >
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={filters.city === "all"}
                  onClick={() => setFilters({ ...filters, city: "all" })}
                >
                  All
                </Chip>
                {cities.map((c) => {
                  const n = countIf("city", { city: c });
                  return (
                    <Chip
                      key={c}
                      active={filters.city === c}
                      disabled={n === 0 && filters.city !== c}
                      count={n}
                      onClick={() => setFilters({ ...filters, city: c })}
                    >
                      {c}
                    </Chip>
                  );
                })}
              </div>
            </FilterPanel>

            <FilterPanel
              title="Price"
              onClear={filters.price !== "all" ? () => setFilters({ ...filters, price: "all" }) : undefined}
            >
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={filters.price === "all"}
                  onClick={() => setFilters({ ...filters, price: "all" })}
                >
                  All
                </Chip>
                {(["Free", "Paid"] as const).map((p) => {
                  const n = countIf("price", { price: p });
                  return (
                    <Chip
                      key={p}
                      active={filters.price === p}
                      disabled={n === 0 && filters.price !== p}
                      count={n}
                      onClick={() => setFilters({ ...filters, price: p })}
                    >
                      {p}
                    </Chip>
                  );
                })}
              </div>
            </FilterPanel>

            {allTags.length > 0 && (
              <FilterPanel
                title="Tags"
                onClear={filters.tags.length ? () => setFilters({ ...filters, tags: [] }) : undefined}
              >
                <div className="flex flex-wrap gap-2">
                  {allTags.map((t) => {
                    const on = filters.tags.includes(t);
                    const n = countIf("tags", {
                      tags: on ? filters.tags.filter((x) => x !== t) : [...filters.tags, t],
                    });
                    return (
                      <Chip
                        key={t}
                        active={on}
                        disabled={n === 0 && !on}
                        count={n}
                        onClick={() => toggleTag(t)}
                      >
                        {t}
                      </Chip>
                    );
                  })}
                </div>
              </FilterPanel>
            )}
          </div>
        </aside>

        {/* ── Results ── */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-fg">
              {heading}
            </h1>
            <span className="text-sm text-faint">
              {results.length} {results.length === 1 ? "event" : "events"}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={draft}
              onChange={(e) => {
                typing.current = true;
                setDraft(e.target.value);
              }}
              placeholder="Search events, city, venue or tag…"
              aria-label="Search events"
              className="w-full flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value as Sort })}
              aria-label="Sort events"
              className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-fg focus:border-brand focus:outline-none"
            >
              <option value="soon">Soonest first</option>
              <option value="later">Latest first</option>
              <option value="free">Free first</option>
            </select>
          </div>

          {/* What's currently narrowing the list */}
          {active.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {active.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    if (d === "q") setDraft("");
                    setFilters(clearDimension(filters, d));
                  }}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-brand/35 bg-brand/[0.06] px-3 py-1.5 text-xs font-medium text-brand-soft transition-colors hover:border-brand/60"
                >
                  {describe(filters, d)}
                  <span className="text-brand/60 transition-colors group-hover:text-brand" aria-hidden>
                    ✕
                  </span>
                </button>
              ))}
              <button
                onClick={clearAll}
                className="text-xs font-medium text-faint underline-offset-2 hover:text-fg hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {results.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
              {recovery ? (
                <>
                  <p className="font-display text-lg text-fg">
                    Nothing matches all of those filters.
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                    Drop the {DIMENSION_LABELS[recovery.dimension]} filter and there
                    {recovery.count === 1 ? " is 1 event" : ` are ${recovery.count} events`} to see.
                  </p>
                  <button
                    onClick={() => {
                      if (recovery.dimension === "q") setDraft("");
                      setFilters(recovery.filters);
                    }}
                    className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Show those {recovery.count === 1 ? "" : `${recovery.count} `}
                    {recovery.count === 1 ? "event" : "events"}
                  </button>
                </>
              ) : (
                <>
                  <p className="font-display text-lg text-fg">
                    {hasFilters ? "No events match your filters." : "No events yet."}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {hasFilters
                      ? "Try clearing them — new events drop every week."
                      : "Check back soon — new events drop every week."}
                  </p>
                  {hasFilters && (
                    <button
                      onClick={clearAll}
                      className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Clear filters
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Human label for an active filter chip. */
function describe(f: Filters, d: Dimension): string {
  switch (d) {
    case "q": return `“${f.q.trim()}”`;
    case "cats": return f.cats.join(", ");
    case "city": return f.city;
    case "price": return f.price;
    case "when": return WHEN_LABELS[f.when as keyof typeof WHEN_LABELS] ?? f.when;
    case "format": return FORMAT_LABELS[f.format as keyof typeof FORMAT_LABELS] ?? f.format;
    case "tags": return f.tags.join(", ");
  }
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
  disabled = false,
  count,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      // Zero-result facets are greyed out rather than removed — a rail that
      // reshuffles itself on every click is harder to use than a dimmed option.
      title={disabled ? "No events match this with your other filters" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-brand text-white"
          : disabled
            ? "cursor-not-allowed border border-line/60 text-faint/50"
            : "border border-line text-muted hover:border-brand/50 hover:text-fg"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span className={`tabular-nums ${active ? "text-white/70" : "text-faint"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
