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
        <h2 className="font-display text-xl font-semibold text-fg">Where</h2>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-join/12 text-join-soft">
            <Icon name="broadcast" className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <div>
            <p className="text-sm font-semibold text-fg">This event is online</p>
            <p className="mt-0.5 text-sm text-muted">
              The joining link is emailed with your ticket and again an hour before
              it starts.
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
      <h2 className="font-display text-xl font-semibold text-fg">Where</h2>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
        {bbox && (
          <iframe
            title={`Map showing ${venue}`}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`}
            loading="lazy"
            className="h-56 w-full border-0"
          />
        )}

        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{venue}</p>
            {address && <p className="mt-0.5 text-sm text-muted">{address}</p>}
            <p className="mt-0.5 text-sm text-faint">{city}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${query}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-brand hover:text-brand"
            >
              Google Maps
            </a>
            <a
              href={`https://maps.apple.com/?q=${query}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-brand hover:text-brand"
            >
              Apple Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
