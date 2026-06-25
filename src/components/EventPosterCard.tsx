import Link from "next/link";
import { Icon } from "@/components/Icon";
import { categoryTheme, type TXFEvent } from "@/lib/data";

/**
 * BookMyShow-style poster card. The poster "image" is generated per category
 * (each category gets its own gradient + icon), so every Workshop / Webinar /
 * Hackathon shares a consistent look. Swap the poster block for a real <Image>
 * when artwork is available.
 */
export function EventPosterCard({ event }: { event: TXFEvent }) {
  const theme = categoryTheme[event.category];
  const isFree = event.price === "Free";

  return (
    <Link href={`/events/${event.slug}`} className="group block">
      {/* Poster */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl shadow-soft">
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

        <span className="absolute left-3 top-3 rounded-md bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          {theme.label}
        </span>
        {isFree && (
          <span className="absolute right-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">
            Free
          </span>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <Icon name={theme.icon} className="h-12 w-12 text-white/90" strokeWidth={1.5} />
          <p className="font-display text-lg font-bold leading-tight text-white drop-shadow-sm">
            {event.title}
          </p>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">
            Techxfluence
          </span>
        </div>

        {/* Date strip */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
          <span>{event.dateLabel}</span>
          <span className="text-white/70">{event.city}</span>
        </div>

        <div className="absolute inset-0 ring-1 ring-inset ring-black/10 transition group-hover:ring-brand/60" />
      </div>

      {/* Meta */}
      <div className="mt-3">
        <h3 className="line-clamp-2 font-display font-semibold text-fg transition-colors group-hover:text-brand">
          {event.title}
        </h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {event.venue}: {event.city}
        </p>
        <p className="mt-0.5 text-sm text-faint">{event.category}</p>
        <p className="mt-1 text-sm font-semibold text-fg">
          {isFree ? "Free" : `${event.priceLabel} onwards`}
        </p>
      </div>
    </Link>
  );
}
