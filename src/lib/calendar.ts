export type CalendarEvent = {
  title: string;
  /** YYYY-MM-DD */
  dateISO: string;
  time?: string;
  location?: string;
  details?: string;
};

/**
 * Build a Google Calendar "add event" URL.
 *
 * Best-effort time parse: a recognisable start time produces a two-hour slot
 * in IST, anything else falls back to an all-day entry rather than dropping
 * the link. Shared by the event page action and the post-registration panel,
 * so the two can't drift apart.
 */
export function googleCalUrl({
  title,
  dateISO,
  time,
  location,
  details,
}: CalendarEvent): string {
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
    const start = new Date(`${dateISO}T${String(h).padStart(2, "0")}:${min}:00+05:30`);
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
