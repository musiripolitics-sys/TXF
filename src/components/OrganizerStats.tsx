import { Icon } from "@/components/Icon";

/** "March 2024" — a month is as precise as a track record needs to be. */
function monthYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/**
 * The organiser's track record, in the same four-tile strip the event page
 * uses for its facts.
 *
 * Somebody on this page is deciding whether to spend an evening with this
 * organiser, and the page used to offer one number towards that decision.
 * These are the four that are actually evidence: how much they have run, how
 * many people turned up, how many are waiting to hear about the next one, and
 * how long they have been at it.
 *
 * A tile is dropped rather than shown as zero when it has nothing to say — a
 * first-time organiser is better served by three honest tiles than by four
 * with "0 people hosted" among them.
 */
export function OrganizerStats({
  eventsCount,
  upcoming,
  past,
  attendees,
  followers,
  hostingSince,
}: {
  eventsCount: number;
  upcoming: number;
  past: number;
  attendees: number;
  followers: number;
  hostingSince: string | null;
}) {
  const since = monthYear(hostingSince);

  const tiles: { icon: string; label: string; value: string; sub?: string }[] = [
    {
      icon: "calendar",
      label: "Events",
      value: `${eventsCount} hosted`,
      sub:
        [
          upcoming > 0 ? `${upcoming} upcoming` : null,
          past > 0 ? `${past} done` : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
    },
    ...(attendees > 0
      ? [
          {
            icon: "users",
            label: "People hosted",
            value: attendees.toLocaleString("en-IN"),
            sub: `across ${past} past event${past === 1 ? "" : "s"}`,
          },
        ]
      : []),
    ...(followers > 0
      ? [
          {
            icon: "bell",
            label: "Followers",
            value: followers.toLocaleString("en-IN"),
            sub: "notified when they publish",
          },
        ]
      : []),
    ...(since
      ? [
          {
            icon: "sparkle",
            label: "Hosting since",
            value: since,
            sub: "first event on Techxfluence",
          },
        ]
      : []),
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="flex items-start gap-3 p-1">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-soft">
            <Icon name={t.icon} className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">
              {t.label}
            </dt>
            <dd className="mt-0.5 font-display text-base font-bold text-fg">
              {t.value}
            </dd>
            {t.sub && <p className="text-xs text-muted">{t.sub}</p>}
          </div>
        </div>
      ))}
    </dl>
  );
}
