import { Icon } from "@/components/Icon";

/**
 * Event quick facts strip: date, time, location, and capacity.
 */
export function EventFacts({
  dateLabel,
  time,
  venue,
  city,
  spotsLeft,
  capacity,
}: {
  dateLabel: string;
  time?: string;
  venue: string;
  city: string;
  spotsLeft: number;
  capacity: number;
}) {
  const isOnline = city?.trim().toLowerCase() === "online";
  const filling = spotsLeft > 0 && spotsLeft <= 25;
  const isSoldOut = spotsLeft <= 0;

  const items: { icon: string; label: string; value: string; sub?: string; badge?: string }[] = [
    {
      icon: "calendar",
      label: "Date",
      value: dateLabel,
    },
    ...(time
      ? [
          {
            icon: "clock",
            label: "Time",
            value: time,
          },
        ]
      : []),
    {
      icon: isOnline ? "broadcast" : "map-pin",
      label: "Location",
      value: isOnline ? "Online Event" : venue,
      sub: isOnline ? "Virtual joining link provided" : city,
    },
    {
      icon: "users",
      label: "Availability",
      value: isSoldOut ? "Sold Out" : `${spotsLeft} spots left`,
      sub: isSoldOut ? "Waitlist open" : `of ${capacity} seats total`,
      badge: isSoldOut ? "Waitlist" : filling ? "Filling fast" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
      {items.map((f) => (
        <div key={f.label} className="flex items-start gap-3 p-1">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-soft">
            <Icon name={f.icon} className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
                {f.label}
              </p>
              {f.badge && (
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                    isSoldOut
                      ? "bg-ink-2 text-muted"
                      : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {f.badge}
                </span>
              )}
            </div>
            <p className="truncate text-sm font-semibold text-fg mt-0.5" title={f.value}>
              {f.value}
            </p>
            {f.sub && (
              <p className="truncate text-xs text-muted mt-0.5" title={f.sub}>
                {f.sub}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
