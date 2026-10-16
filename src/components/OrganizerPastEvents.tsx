import Link from "next/link";
import { Icon } from "@/components/Icon";
import { categoryTheme, type TXFEvent } from "@/lib/data";

/** "29 Aug 2025" — a past event only needs to say when, not which weekday. */
function pastDate(iso: string, fallback: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * What this organiser has already run.
 *
 * Deliberately a list and not the card grid the upcoming events get: a past
 * event is a credential, not an offer, and giving it the same artwork and
 * "spots left" treatment would make a finished event look bookable. Each row
 * still links through, because the page it links to is the record of what
 * happened — the agenda, the speakers, who came.
 */
export function OrganizerPastEvents({
  events,
  attendance,
}: {
  events: TXFEvent[];
  attendance?: Record<string, { going: number; names: string[] }>;
}) {
  if (events.length === 0) return null;

  return (
    <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      {events.map((e) => {
        const theme = categoryTheme[e.category];
        const went = e.id ? attendance?.[e.id]?.going ?? 0 : 0;

        return (
          <li key={e.slug}>
            <Link
              href={`/events/${e.slug}`}
              className="group flex items-center gap-4 p-4 transition-colors hover:bg-ink-2"
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                }}
              >
                <Icon name={theme.icon} className="h-5 w-5" strokeWidth={1.7} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-semibold text-fg transition-colors group-hover:text-brand">
                  {e.title}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {[
                    pastDate(e.date, e.dateLabel),
                    e.city?.toLowerCase() === "online" ? "Online" : e.city,
                    went > 0
                      ? `${went} ${went === 1 ? "person" : "people"} came`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <span className="hidden shrink-0 rounded-full bg-ink-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-faint sm:block">
                {theme.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
