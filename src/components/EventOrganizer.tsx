import Link from "next/link";
import { FollowOrganizerBtn } from "@/components/FollowOrganizerBtn";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}

/**
 * Who's running this. Replaces the bare text link — following an organiser was
 * already built, it just wasn't reachable from the event people are reading.
 */
export function EventOrganizer({
  hostId,
  hostName,
  eventsHosted,
  followers,
}: {
  hostId?: string;
  hostName?: string;
  eventsHosted?: number;
  followers?: number;
}) {
  if (!hostName) return null;

  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Organiser</h2>
      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-join text-sm font-bold text-white shadow-sm">
          {initials(hostName)}
        </span>

        <div className="min-w-0 flex-1">
          {hostId ? (
            <Link
              href={`/organizer/${hostId}`}
              className="font-display text-base font-bold text-fg hover:text-brand"
            >
              {hostName}
            </Link>
          ) : (
            <p className="font-display text-base font-bold text-fg">{hostName}</p>
          )}
          <p className="mt-0.5 text-sm text-muted">
            {[
              typeof eventsHosted === "number"
                ? `${eventsHosted} ${eventsHosted === 1 ? "event" : "events"} hosted`
                : null,
              typeof followers === "number"
                ? `${followers} ${followers === 1 ? "follower" : "followers"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Techxfluence organiser"}
          </p>
        </div>

        {hostId && (
          <FollowOrganizerBtn organizerId={hostId} initialFollowers={followers ?? 0} />
        )}
      </div>
    </section>
  );
}
