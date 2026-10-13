/**
 * Card, KpiCard and EmptyState.
 *
 * Copied out of components/os when the OS left this repository. The ambassador
 * page is the only thing on this site that uses them, and keeping a
 * components/os directory in a repo with no OS in it would have been the last
 * thread tying the two products together. Everything else that came across —
 * the status, priority and CRM-stage badges, the dashboard panels and the
 * target-vs-actual meter — described work this site does not track, and went
 * with the OS.
 */
import Link from "next/link";
import type { ReactNode } from "react";

/** A soft-elevated content card, matching the site's `.shadow-soft` cards. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-5 shadow-soft ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * A clickable KPI tile. Every dashboard number links to the records behind it
 * (requirement: "Every KPI must be clickable"). When `value` is empty we show
 * a muted 0 / placeholder rather than a fake statistic.
 */
export function KpiCard({
  label,
  value,
  sub,
  href,
  tone = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  href?: string;
  tone?: "default" | "good" | "bad" | "warn" | "brand";
  hint?: string;
}) {
  const toneClass = {
    default: "text-fg",
    good: "text-green-600",
    bad: "text-red-600",
    warn: "text-amber-600",
    brand: "text-brand-soft",
  }[tone];

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
          {label}
        </p>
        {href && (
          <span className="text-faint transition-colors group-hover:text-brand-soft">
            ↗
          </span>
        )}
      </div>
      <p className={`mt-2 font-display text-2xl font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {sub != null && <p className="mt-1 text-xs text-muted">{sub}</p>}
      {hint && <p className="mt-0.5 text-[11px] text-faint">{hint}</p>}
    </>
  );

  const base =
    "group block rounded-2xl border border-line bg-surface p-4 shadow-soft transition-all";
  return href ? (
    <Link href={href} className={`${base} hover:-translate-y-0.5 hover:border-brand/40`}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

/** Shown wherever a module has no rows yet — never a fake number. */
export function EmptyState({
  title = "No data yet",
  hint,
  action,
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-12 text-center">
      <p className="font-display text-sm font-semibold text-fg">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
