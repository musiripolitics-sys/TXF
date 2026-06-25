import Link from "next/link";
import { Icon } from "@/components/Icon";
import { categoryTheme, type TXFEvent } from "@/lib/data";

/**
 * Horizontal event row — landscape thumbnail + details, in the TXF brand.
 * The thumbnail "image" is generated per category (gradient + icon).
 */
export function EventRow({ event }: { event: TXFEvent }) {
  const theme = categoryTheme[event.category];
  const isFree = event.price === "Free";
  const fillingFast = event.spotsLeft <= 25;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex gap-4 rounded-2xl border border-line bg-surface p-3 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 sm:gap-5 sm:p-4"
    >
      {/* Landscape thumbnail */}
      <div className="relative aspect-[16/11] w-32 shrink-0 overflow-hidden rounded-xl sm:w-56">
        {event.image ? (
          <>
            <img
              src={event.image}
              alt={event.title}
              className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/50" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
              }}
            />
            <div className="absolute inset-0 bg-grid opacity-20" aria-hidden />
          </>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          {theme.label}
        </span>
        <div className="absolute inset-0 grid place-items-center">
          <Icon
            name={theme.icon}
            className="h-8 w-8 text-white/90 sm:h-10 sm:w-10"
            strokeWidth={1.5}
          />
        </div>
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ink-2 px-2.5 py-0.5 text-[11px] font-medium text-faint">
            {event.category}
          </span>
          {fillingFast && (
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-soft">
              Filling fast
            </span>
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 font-display text-base font-semibold text-fg transition-colors group-hover:text-brand sm:text-lg">
          {event.title}
        </h3>

        <p className="mt-1 text-sm text-muted">
          {event.dateLabel} · {event.time}
        </p>
        <p className="truncate text-sm text-muted">
          {event.city} · {event.venue}
        </p>

        <p className="mt-auto pt-2 text-sm font-semibold text-fg">
          {isFree ? "Free" : `From ${event.priceLabel}`}
        </p>
      </div>
    </Link>
  );
}
