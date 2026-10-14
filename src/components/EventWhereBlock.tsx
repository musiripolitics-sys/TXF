import { Icon } from "@/components/Icon";

/**
 * "Getting there" — the second question every attendee has.
 *
 * A real map is only drawn when the event has coordinates; otherwise this
 * shows the address with map links rather than an embed pointing at the wrong
 * place. Online events get a plain statement instead, because a map is the
 * wrong answer entirely.
 */
export function EventWhereBlock({
  venue,
  address,
  city,
  latitude,
  longitude,
}: {
  venue: string;
  address?: string;
  city: string;
  latitude?: number;
  longitude?: number;
}) {
  const isOnline = city?.trim().toLowerCase() === "online";

  if (isOnline) {
    return (
      <section>
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Where</h2>
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-join/10 text-join-soft">
            <Icon name="broadcast" className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-sm font-semibold text-fg">This event is online</p>
            <p className="mt-1 text-sm text-muted">
              The virtual joining link is emailed with your ticket pass and again before the event starts.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const full = [venue, address, city].filter(Boolean).join(", ");
  const hasCoords = typeof latitude === "number" && typeof longitude === "number";
  const query = encodeURIComponent(full);

  // OpenStreetMap's embed needs no API key. A small box around the point is
  // enough to answer "roughly where is this?".
  const d = 0.008;
  const bbox = hasCoords
    ? `${longitude! - d},${latitude! - d},${longitude! + d},${latitude! + d}`
    : null;

  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Where</h2>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
        {bbox ? (
          <iframe
            title={`Map showing ${venue}`}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`}
            loading="lazy"
            className="h-56 w-full border-0"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-ink-2/60 border-b border-line px-4 text-center">
            <div className="flex flex-col items-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand mb-2">
                <Icon name="map-pin" className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <p className="text-sm font-medium text-fg">{venue}</p>
              <p className="text-xs text-muted mt-0.5">{city}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg">{venue}</p>
            {address && <p className="mt-0.5 text-sm text-muted">{address}</p>}
            <p className="mt-0.5 text-xs text-faint">{city}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${query}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-brand hover:text-brand shadow-sm"
            >
              Google Maps ↗
            </a>
            <a
              href={`https://maps.apple.com/?q=${query}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-brand hover:text-brand shadow-sm"
            >
              Apple Maps ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
