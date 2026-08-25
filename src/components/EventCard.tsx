import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SaveEventBtn } from "@/components/SaveEventBtn";
import { categoryTheme, type TXFEvent } from "@/lib/data";

/**
 * Marketplace event card (Eventbrite-style): image on top, then date, title,
 * venue and price. Whole card links to the detail page. Styled in the TXF
 * brand — dark surfaces, brand accent, per-category gradient when no artwork.
 */
export function EventCard({ event }: { event: TXFEvent }) {
  const theme = categoryTheme[event.category];
  const isFree = event.price === "Free";
  const isOnline = event.city?.toLowerCase() === "online";
  const fillingFast = event.spotsLeft > 0 && event.spotsLeft <= 25;
  const soldOut = event.spotsLeft <= 0;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.25)]"
    >
      {/* Cover */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {event.category}
          </span>
          {isOnline && (
            <span className="rounded-full bg-join/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              Online
            </span>
          )}
        </div>

        {/* Save + status sit together, top-right */}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {soldOut ? (
            <span className="rounded-full bg-red-500/90 px-2.5 py-1 text-[11px] font-bold text-white">
              Sold out
            </span>
          ) : fillingFast ? (
            <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
              Filling fast
            </span>
          ) : null}
          {event.id && (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black/40 backdrop-blur-sm">
              <SaveEventBtn eventId={event.id} className="!text-white/90 hover:!text-brand" />
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-soft">
          {event.dateLabel}
        </p>
        <h3 className="mt-1.5 line-clamp-2 font-display text-base font-bold leading-snug text-fg transition-colors group-hover:text-brand">
          {event.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 truncate text-sm text-muted">
          <Icon name="map-pin" className="h-3.5 w-3.5 shrink-0 text-faint" />
          {event.city}
          {event.venue && !isOnline ? ` · ${event.venue}` : ""}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-sm font-bold text-fg">
            {isFree ? "Free" : `From ${event.priceLabel}`}
          </span>
          {!soldOut && (
            <span className="text-xs text-faint">{event.spotsLeft} left</span>
          )}
        </div>
      </div>
    </Link>
  );
}
