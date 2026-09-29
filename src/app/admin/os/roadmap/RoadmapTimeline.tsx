"use client";

import { useMemo, useState } from "react";
import { STATUS_META, shortDate, type BosStatus } from "@/lib/bos";
import type { Goal, RoadmapTask, Workstream } from "./types";

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

const BAR: Record<BosStatus, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-500",
  not_started: "bg-slate-300",
  blocked: "bg-red-500",
  on_hold: "bg-amber-500",
  cancelled: "bg-slate-200",
};

/**
 * A timeline of the plan: every goal as a bar across the date axis, with the
 * tasks it produced nested beneath it. The calendar answers "what happens on
 * the 14th"; this answers "what runs over what, and what is already late".
 */
export function RoadmapTimeline({
  goals,
  tasks,
  workstreams,
  onOpenGoal,
}: {
  goals: Goal[];
  tasks: RoadmapTask[];
  workstreams: Workstream[];
  onOpenGoal: (g: Goal) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const wsMap = Object.fromEntries(workstreams.map((w) => [w.id, w]));
  const today = iso(new Date());

  // The axis spans everything dated, padded to whole weeks so the grid lines up.
  const span = useMemo(() => {
    const dates = [
      ...goals.flatMap((g) => [g.start_date, g.end_date]),
      ...tasks.flatMap((t) => [t.start_date, t.due_date]),
    ].filter(Boolean) as string[];
    if (dates.length === 0) return null;
    const min = new Date(dates.reduce((a, b) => (a < b ? a : b)).slice(0, 10));
    const max = new Date(dates.reduce((a, b) => (a > b ? a : b)).slice(0, 10));
    min.setDate(min.getDate() - 3);
    max.setDate(max.getDate() + 3);
    return { min, max, days: Math.max(1, Math.round((+max - +min) / DAY)) };
  }, [goals, tasks]);

  if (!span) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-12 text-center text-sm text-muted">
        Nothing dated yet. Give goals a start and end date to see them on the timeline.
      </p>
    );
  }

  /** Left offset and width as percentages of the whole span. */
  const place = (from: string | null, to: string | null) => {
    const a = new Date((from ?? to ?? iso(span.min)).slice(0, 10));
    const b = new Date((to ?? from ?? iso(span.min)).slice(0, 10));
    const left = ((+a - +span.min) / DAY / span.days) * 100;
    const width = Math.max(1.2, ((+b - +a) / DAY / span.days) * 100);
    return { left: `${left}%`, width: `${width}%` };
  };

  // Month ticks across the top.
  const months: { label: string; left: number }[] = [];
  const cur = new Date(span.min.getFullYear(), span.min.getMonth(), 1);
  while (cur <= span.max) {
    if (cur >= span.min) {
      months.push({
        label: cur.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        left: ((+cur - +span.min) / DAY / span.days) * 100,
      });
    }
    cur.setMonth(cur.getMonth() + 1);
  }
  const todayLeft = ((+new Date(today) - +span.min) / DAY / span.days) * 100;
  const todayInRange = todayLeft >= 0 && todayLeft <= 100;

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <div className="min-w-[900px]">
        {/* Month axis */}
        <div className="relative h-8 border-b border-line bg-surface-2">
          <div className="absolute inset-y-0 left-0 w-56 border-r border-line" />
          <div className="absolute inset-y-0 left-56 right-0">
            {months.map((m) => (
              <span
                key={m.label}
                className="absolute top-2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider text-faint"
                style={{ left: `${m.left}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          {/* Today marker runs the full height */}
          {todayInRange && (
            <div className="pointer-events-none absolute inset-y-0 left-56 right-0 z-10">
              <div
                className="absolute inset-y-0 w-px bg-brand"
                style={{ left: `${todayLeft}%` }}
              >
                <span className="absolute -top-0 -translate-x-1/2 rounded-b bg-brand px-1 text-[9px] font-semibold text-white">
                  today
                </span>
              </div>
            </div>
          )}

          {goals.map((g) => {
            const mine = tasks.filter((t) => t.goal_id === g.id);
            const open = expanded.has(g.id);
            const ws = g.workstream_id ? wsMap[g.workstream_id] : null;
            const late =
              !!g.end_date &&
              g.end_date.slice(0, 10) < today &&
              g.status !== "completed" &&
              g.status !== "cancelled";

            return (
              <div key={g.id} className="border-b border-line/60 last:border-0">
                {/* Goal row */}
                <div className="flex items-center hover:bg-surface-2">
                  <button
                    type="button"
                    onClick={() => mine.length > 0 && toggle(g.id)}
                    className="flex w-56 shrink-0 items-center gap-2 border-r border-line px-3 py-2.5 text-left"
                  >
                    <span className={`w-3 text-[10px] text-faint ${mine.length === 0 ? "opacity-0" : ""}`}>
                      {open ? "▾" : "▸"}
                    </span>
                    {ws && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: ws.color ?? "#999" }}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-fg">
                      {g.code ? `${g.code} · ` : ""}
                      {g.objective}
                    </span>
                    {mine.length > 0 && (
                      <span className="shrink-0 text-[10px] text-faint">{mine.length}</span>
                    )}
                  </button>

                  <div className="relative h-10 flex-1">
                    <button
                      type="button"
                      onClick={() => onOpenGoal(g)}
                      title={`${g.objective} — ${shortDate(g.start_date)} to ${shortDate(g.end_date)}`}
                      className={`absolute top-3 h-4 rounded-full ${BAR[g.status]} ${late ? "ring-2 ring-red-400" : ""}`}
                      style={place(g.start_date, g.end_date)}
                    />
                  </div>
                </div>

                {/* Task rows */}
                {open &&
                  mine.map((t) => {
                    const tLate =
                      !!t.due_date &&
                      t.due_date.slice(0, 10) < today &&
                      t.status !== "completed" &&
                      t.status !== "cancelled";
                    return (
                      <div key={t.id} className="flex items-center bg-surface-2/40">
                        <div className="flex w-56 shrink-0 items-center gap-2 border-r border-line py-1.5 pl-9 pr-3">
                          <span className="font-mono text-[10px] text-faint">{t.code}</span>
                          <span className="min-w-0 flex-1 truncate text-[11px] text-muted">
                            {t.title}
                          </span>
                        </div>
                        <div className="relative h-7 flex-1">
                          <div
                            title={`${t.title} — ${shortDate(t.start_date)} to ${shortDate(t.due_date)} · ${STATUS_META[t.status].label}`}
                            className={`absolute top-2.5 h-2 rounded-full ${BAR[t.status]} ${tLate ? "ring-2 ring-red-400" : ""}`}
                            style={place(t.start_date, t.due_date)}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
