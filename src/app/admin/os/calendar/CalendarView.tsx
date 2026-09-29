"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export type CalItem = {
  date: string;
  type: string;
  label: string;
  href: string;
};

/**
 * Every entry type, with a colour AND an icon.
 *
 * Research on dense calendars is blunt about this: a category that exists only
 * as a hue is invisible to a meaningful share of readers, so colour never
 * carries a distinction on its own here.
 */
export const TYPES: Record<string, { color: string; bg: string; icon: string; short: string }> = {
  "Task due":      { color: "#2563eb", bg: "#eff6ff", icon: "check",    short: "Due" },
  "Task overdue":  { color: "#dc2626", bg: "#fef2f2", icon: "bell",     short: "Late" },
  "Task done":     { color: "#16a34a", bg: "#f0fdf4", icon: "check",    short: "Done" },
  "Goal":          { color: "#7c3aed", bg: "#f5f3ff", icon: "rocket",   short: "Goal" },
  "Event":         { color: "#ea580c", bg: "#fff7ed", icon: "calendar", short: "Event" },
  "Campaign":      { color: "#db2777", bg: "#fdf2f8", icon: "broadcast",short: "Campaign" },
  "Content":       { color: "#9333ea", bg: "#faf5ff", icon: "book",     short: "Content" },
  "Podcast":       { color: "#0891b2", bg: "#ecfeff", icon: "mic",      short: "Podcast" },
  "Hiring":        { color: "#c026d3", bg: "#fdf4ff", icon: "users",    short: "Hiring" },
  "Legal due":     { color: "#475569", bg: "#f8fafc", icon: "book",     short: "Legal" },
  "Legal expiry":  { color: "#dc2626", bg: "#fef2f2", icon: "clock",    short: "Expiry" },
};
const fallback = { color: "#64748b", bg: "#f8fafc", icon: "tag", short: "Other" };
const styleOf = (t: string) => TYPES[t] ?? fallback;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The business calendar as a grid.
 *
 * It used to be a list of dated rows, which wasted most of the width and made
 * "what does that week look like" unanswerable. A month fits on one screen
 * here; a cell shows three entries and counts the rest, and clicking any day
 * opens everything on it.
 */
export function CalendarView({ items, months }: { items: CalItem[]; months: string[] }) {
  const today = iso(new Date());
  const firstWithData = months[0] ?? today.slice(0, 7);
  const [cursor, setCursor] = useState(() =>
    months.includes(today.slice(0, 7)) ? today.slice(0, 7) : firstWithData,
  );
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => items.filter((i) => !hidden.has(i.type)),
    [items, hidden],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const i of visible) m.set(i.date, [...(m.get(i.date) ?? []), i]);
    return m;
  }, [visible]);

  // Weeks start Monday, which is how a working calendar is read.
  const [y, mo] = cursor.split("-").map(Number);
  const first = new Date(y, mo - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(y, mo - 1, 1 - startOffset);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  // A sixth row is only drawn when the month actually needs one.
  const rows = cells[35] && cells[35].getMonth() === mo - 1 ? 6 : 5;

  const shift = (n: number) => {
    const d = new Date(y, mo - 1 + n, 1);
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthName = first.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const inMonth = (d: Date) => d.getMonth() === mo - 1;
  const present = [...new Set(items.map((i) => i.type))].sort();
  const dayItems = openDay ? (byDate.get(openDay) ?? []) : [];

  return (
    <>
      {/* ── Controls ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} aria-label="Previous month"
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand">
            ‹
          </button>
          <h2 className="min-w-[10rem] px-2 text-center font-display text-base font-bold text-fg">
            {monthName}
          </h2>
          <button onClick={() => shift(1)} aria-label="Next month"
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand">
            ›
          </button>
          <button onClick={() => setCursor(today.slice(0, 7))}
            className="ml-2 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:border-brand hover:text-brand">
            Today
          </button>
        </div>

        {/* Legend doubles as a filter — the quickest way to cut density. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {present.map((t) => {
            const s = styleOf(t);
            const off = hidden.has(t);
            return (
              <button
                key={t}
                onClick={() =>
                  setHidden((h) => {
                    const n = new Set(h);
                    if (n.has(t)) n.delete(t);
                    else n.add(t);
                    return n;
                  })
                }
                title={off ? `Show ${t}` : `Hide ${t}`}
                className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-opacity ${
                  off ? "border-line text-faint opacity-50" : "border-line text-muted"
                }`}
                style={off ? undefined : { background: s.bg, borderColor: s.color + "40", color: s.color }}
              >
                <Icon name={s.icon} className="h-3 w-3" strokeWidth={2} />
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid grid-cols-7 border-b border-line bg-surface-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-faint">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.slice(0, rows * 7).map((d, i) => {
            const key = iso(d);
            const list = byDate.get(key) ?? [];
            const isToday = key === today;
            const out = !inMonth(d);
            return (
              <button
                key={key}
                onClick={() => list.length > 0 && setOpenDay(key)}
                className={`min-h-[6.5rem] border-b border-r border-line/70 p-1.5 text-left align-top transition-colors last:border-r-0 ${
                  out ? "bg-ink/30" : "bg-surface hover:bg-surface-2"
                } ${i % 7 === 6 ? "border-r-0" : ""}`}
              >
                <span
                  className={`mb-1 inline-grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] tabular-nums ${
                    isToday
                      ? "bg-brand font-bold text-white"
                      : out
                        ? "text-faint"
                        : "font-medium text-muted"
                  }`}
                >
                  {d.getDate()}
                </span>

                <span className="block space-y-0.5">
                  {list.slice(0, 3).map((it, n) => {
                    const s = styleOf(it.type);
                    return (
                      <span
                        key={n}
                        title={`${it.type}: ${it.label}`}
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight"
                        style={{ background: s.bg, color: s.color }}
                      >
                        <Icon name={s.icon} className="h-2.5 w-2.5 shrink-0" strokeWidth={2.4} />
                        <span className="truncate">{it.label}</span>
                      </span>
                    );
                  })}
                  {list.length > 3 && (
                    <span className="block px-1 text-[10px] font-medium text-brand-soft">
                      +{list.length - 3} more
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── A day, in full ── */}
      {openDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button aria-label="Close" onClick={() => setOpenDay(null)}
            className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm" />
          <div role="dialog" aria-modal="true"
            className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface shadow-soft">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
              <h3 className="font-display text-sm font-bold text-fg">
                {new Date(openDay).toLocaleDateString("en-IN", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </h3>
              <button onClick={() => setOpenDay(null)} className="text-sm text-faint hover:text-fg">
                Close
              </button>
            </div>
            <div className="divide-y divide-line">
              {dayItems.map((it, n) => {
                const s = styleOf(it.type);
                return (
                  <Link key={n} href={it.href}
                    className="flex items-start gap-2.5 px-5 py-3 hover:bg-surface-2">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg"
                      style={{ background: s.bg, color: s.color }}>
                      <Icon name={s.icon} className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: s.color }}>
                        {it.type}
                      </span>
                      <span className="block text-sm text-fg">{it.label}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
