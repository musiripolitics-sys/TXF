"use client";

import { Icon } from "./Icon";
import { toast } from "./Toast";

interface Props {
  title: string;
  dateISO: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  details?: string;
}

/** Build a Google Calendar "add event" URL (best-effort time parse; all-day fallback). */
function googleCalUrl({ title, dateISO, time, location, details }: Props): string {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const params = new URLSearchParams({
    text: title,
    location: location ?? "",
    details: details ?? "",
  });

  const m = time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m) {
    let h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) h += 12;
    const min = m[2];
    // Treat the time as IST (+05:30) and convert to UTC for the calendar link.
    const start = new Date(
      `${dateISO}T${String(h).padStart(2, "0")}:${min}:00+05:30`,
    );
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    params.set("dates", `${fmt(start)}/${fmt(end)}`);
  } else {
    // All-day: end date is exclusive (next day).
    const d = new Date(`${dateISO}T00:00:00`);
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    const day = (x: Date) =>
      `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
    params.set("dates", `${day(d)}/${day(next)}`);
  }
  return `${base}&${params.toString()}`;
}

export function EventActions(props: Props) {
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: props.title, url });
      } catch {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Event link copied to clipboard", "success");
    } catch {
      toast("Couldn't copy the link", "error");
    }
  };

  return (
    <div className="flex gap-2">
      <a
        href={googleCalUrl(props)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-brand hover:text-brand"
      >
        <Icon name="calendar" className="h-4 w-4" />
        Add to Calendar
      </a>
      <button
        type="button"
        onClick={share}
        aria-label="Share this event"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-brand hover:text-brand"
      >
        <Icon name="share" className="h-4 w-4" />
        Share
      </button>
    </div>
  );
}
