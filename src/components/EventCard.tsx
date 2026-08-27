import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SaveEventBtn } from "@/components/SaveEventBtn";
import { categoryTheme, type TXFEvent } from "@/lib/data";
import { GoingStrip } from "./GoingStrip";

/**
 * Event card.
 *
 * Reads title-first, the way the big listing sites do: the artwork leads, the
 * title is the largest thing under it, and everything after is one quiet line
 * each — when, who's running it, who's going. The whole thing sits in a single
 * surface so a grid of them reads as a set of objects rather than columns of
 * loose text.
 *
 * Price, format and urgency ride on the image as badges rather than taking a
 * row of their own.
 */

/** "Sat, 29 Aug" — the weekday is what people actually scan for. */
function shortDate(iso: string, fallback: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Times are stored as a range; the card only needs the start. */
function startTime(time?: string): string | null {
  if (!time) return null;
  const first = time.split(/[–—-]/)[0]?.trim();
  return first || null;
}

export function EventCard({
  event,
  attendance,
}: {
  event: TXFEvent;
  attendance?: { going: number; names: string[] };
}) {
  const theme = categoryTheme[event.category];
  const isFree = event.price === "Free";
  const isOnline = event.city?.toLowerCase() === "online";
  const fillingFast = event.spotsLeft > 0 && event.spotsLeft <= 25;
  const soldOut = event.spotsLeft <= 0;

  const when = [shortDate(event.date, event.dateLabel), startTime(event.time)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.25)]"
    >
      {/* Cover */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
            />
            <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
            <div className="absolute inset-0 grid place-items-center">
              <Icon name={theme.icon} className="h-12 w-12 text-white/85" strokeWidth={1.4} />
            </div>
          </>
        )}

        {/* Status and price, top-left. Solid white so they stay legible over
            any photograph. */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          {soldOut ? (
            <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              Sold out
            </span>
          ) : fillingFast ? (
            <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              Filling fast
            </span>
          ) : null}

          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-fg shadow-sm">
            {isFree ? "Free" : event.priceLabel}
          </span>

          {isOnline && (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-fg shadow-sm">
              Online
            </span>
          )}
        </div>

        {event.id && (
          <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 backdrop-blur-sm transition-colors hover:bg-black/60">
            <SaveEventBtn eventId={event.id} className="!text-white hover:!text-brand" />
          </span>
        )}
      </div>

      {/* Body — title leads, then one quiet line each. */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug tracking-tight text-fg transition-colors group-hover:text-brand">
          {event.title}
        </h3>

        <p className="mt-1.5 text-sm text-muted">{when}</p>

        <p className="mt-0.5 truncate text-sm text-muted">
          {event.hostName ? `by ${event.hostName} · ` : ""}
          {isOnline ? "Online" : event.city}
        </p>

        {event.tags && event.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {event.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-ink-2 px-2 py-0.5 text-[11px] font-medium text-faint"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-3">
          {attendance && attendance.going > 0 ? (
            <GoingStrip going={attendance.going} names={attendance.names} />
          ) : !soldOut ? (
            <span className="text-sm text-faint">{event.spotsLeft} spots left</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
