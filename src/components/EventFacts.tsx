import { Icon } from "@/components/Icon";

/**
 * The band directly under the title: when, where and how long — the three
 * facts that were previously the smallest text on the page, buried in the
 * sidebar.
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

  const items: { icon: string; label: string; value: string }[] = [
    { icon: "calendar", label: "Date", value: dateLabel },
    ...(time ? [{ icon: "clock", label: "Time", value: time }] : []),
    {
      icon: isOnline ? "broadcast" : "map-pin",
      label: "Location",
      value: isOnline ? "Online" : `${venue}, ${city}`,
    },
    {
      icon: "users",
      label: "Spots",
      value: spotsLeft <= 0 ? "Sold out" : `${spotsLeft} of ${capacity} left`,
    },
  ];

  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((f) => (
        <div key={f.label} className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-soft">
            <Icon name={f.icon} className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              {f.label}
            </p>
            <p
              className={`truncate text-sm font-medium ${
                f.label === "Spots" && filling ? "text-brand-soft" : "text-fg"
              }`}
              title={f.value}
            >
              {f.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
