import type { EventCategory } from "@/lib/data";
import { eventCategories } from "@/lib/data";

/**
 * Every field of an event that a person may edit, declared once.
 *
 * The host dashboard used to list six of them — title, time, venue, address,
 * blurb, about — in three places that had to agree: the EventEdits type, the
 * function that seeds it from a row, and the JSX that renders the inputs.
 * Adding a seventh meant remembering all three, which is why it stayed at six
 * while the database happily allowed a host to change any column on their own
 * event.
 *
 * Declaring the fields here means the form, the state and the save are all
 * derived from one list. A field added below appears in the UI and is written
 * on save without touching any of them.
 */
export type FieldKind = "text" | "textarea" | "date" | "time" | "select";

export type EventField = {
  /** The form key, and the events column unless `column` says otherwise. */
  key: string;
  label: string;
  kind: FieldKind;
  column?: string;
  options?: readonly string[];
  hint?: string;
  rows?: number;
  /**
   * Held in the form but not a column of its own. Start and end time are the
   * case this exists for: together with the date and the zone they produce
   * `time`, `starts_at` and `ends_at`, which formToEvent does once rather
   * than three fields each doing a third of it.
   */
  derived?: boolean;
  /** Carried for that derivation, never rendered. */
  hidden?: boolean;
  /** Row -> form string. */
  from: (row: Record<string, unknown>) => string;
  /** Form string -> column value. Absent for a derived field. */
  to?: (value: string) => unknown;
};

const str = (v: unknown) => (v == null ? "" : String(v));
const trimmedOrNull = (v: string) => (v.trim() ? v.trim() : null);

/** Every event is in some zone; almost all of them are in this one. */
const DEFAULT_TZ = "Asia/Kolkata";
const tzOf = (row: Record<string, unknown>) => str(row.timezone) || DEFAULT_TZ;

/** "HH:MM" on the wall clock in `timeZone` — what an <input type="time"> wants. */
function wallClock(iso: unknown, timeZone: string): string {
  if (!iso) return "";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

const pad = (n: number) => String(n).padStart(2, "0");

function to24(h: number, m: number, meridiem?: string): string {
  let hour = h % 12;
  if (meridiem?.toLowerCase().startsWith("p")) hour += 12;
  else if (!meridiem) hour = h % 24;
  return `${pad(hour)}:${pad(m)}`;
}

/**
 * The first start and end time in a free-text line, as 24-hour "HH:MM".
 *
 * Time was a single text box until now, so the column holds whatever the host
 * typed — one live event holds four slots run together into one string. This
 * does not try to understand that. It lifts the first two clock times so the
 * new boxes open with something recognisable instead of empty, and the host
 * fixes the rest; the agenda is where a run of sessions belongs.
 *
 * A bare number is not a time: only HH:MM counts, so a stray year or a "90
 * mins" cannot be read as one.
 */
export function parseTimeRange(text: string): [string, string] {
  const found: { h: number; m: number; mer?: string }[] = [];
  const re = /(\d{1,2}):(\d{2})\s*([ap])\.?m\.?/gi;
  const bare = /(\d{1,2}):(\d{2})/g;

  // Pass one keeps the meridiem that was written next to the time.
  for (const m of text.matchAll(bare)) {
    const at = m.index ?? 0;
    const tail = text.slice(at, at + m[0].length + 5);
    const withMer = [...tail.matchAll(re)][0];
    found.push({
      h: Number(m[1]),
      m: Number(m[2]),
      mer: withMer ? withMer[3] : undefined,
    });
    if (found.length === 2) break;
  }
  if (found.length === 0) return ["", ""];

  // "10:00 – 11:30 AM" means both are morning: an unmarked first time takes
  // the second one's meridiem, which is how everyone writes a range.
  if (found[0] && !found[0].mer && found[1]?.mer) found[0].mer = found[1].mer;

  return [
    to24(found[0].h, found[0].m, found[0].mer),
    found[1] ? to24(found[1].h, found[1].m, found[1].mer) : "",
  ];
}

/**
 * Topics, "good to know" and the refund policy are NOT here. They live in
 * EventContentEditor alongside the agenda and the speakers, and a field
 * belongs to exactly one form: two forms writing the same column means
 * whichever is saved second silently reverts the first.
 */
export const EVENT_FIELDS: EventField[] = [
  { key: "title", label: "Title", kind: "text",
    from: (r) => str(r.title), to: (v) => v.trim() },
  { key: "category", label: "Category", kind: "select", options: eventCategories,
    from: (r) => str(r.category) || "Meetup", to: (v) => v as EventCategory },
  { key: "date", label: "Date", kind: "date", hint: "The first day",
    from: (r) => str(r.date), to: (v) => v || null },
  { key: "end_date", label: "End date", kind: "date",
    hint: "Optional — for a course or anything running over several days",
    from: (r) => str(r.end_date), to: (v) => v || null },
  { key: "start_time", label: "Start time", kind: "time", derived: true,
    from: (r) => wallClock(r.starts_at, tzOf(r)) || parseTimeRange(str(r.time))[0] },
  { key: "end_time", label: "End time", kind: "time", derived: true,
    from: (r) => wallClock(r.ends_at, tzOf(r)) || parseTimeRange(str(r.time))[1] },
  { key: "timezone", label: "Time zone", kind: "text", derived: true, hidden: true,
    from: (r) => tzOf(r) },
  { key: "city", label: "City", kind: "text",
    from: (r) => str(r.city), to: (v) => v.trim() },
  { key: "venue", label: "Venue", kind: "text",
    from: (r) => str(r.venue), to: trimmedOrNull },
  { key: "address", label: "Address", kind: "text",
    from: (r) => str(r.address), to: trimmedOrNull },
  { key: "blurb", label: "Short summary", kind: "textarea", rows: 2,
    hint: "The line under the title, and in listings",
    from: (r) => str(r.blurb), to: trimmedOrNull },
  { key: "about", label: "Full description", kind: "textarea", rows: 8,
    hint: "Blank lines separate paragraphs; a short line on its own becomes a heading",
    from: (r) => str(r.about), to: trimmedOrNull },
  { key: "latitude", label: "Latitude", kind: "text", hint: "Optional, for the map",
    from: (r) => str(r.latitude), to: (v) => (v.trim() ? Number(v) : null) },
  { key: "longitude", label: "Longitude", kind: "text", hint: "Optional, for the map",
    from: (r) => str(r.longitude), to: (v) => (v.trim() ? Number(v) : null) },
];

/** A form object filled from an events row. */
export function eventToForm(row: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(EVENT_FIELDS.map((f) => [f.key, f.from(row)]));
}

/**
 * The instant a wall-clock time in a named zone actually happens, as ISO.
 *
 * The browser's own zone is not the event's — a host travelling, or running
 * an online event for another country, would otherwise write a timestamp that
 * is hours out. Intl knows the offset; the probe is a day accurate, which is
 * all an offset lookup needs anywhere except within a few hours of a daylight
 * saving change.
 */
function instant(date: string, time: string, timeZone: string): string | null {
  if (!date || !time) return null;
  const probe = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(probe.getTime())) return null;

  const name =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(probe)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const offset = name.replace("GMT", "") || "+00:00";

  const at = new Date(`${date}T${time}:00${offset}`);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** "10:00 AM – 11:30 AM IST" — the line people read on the event page. */
function timeLabel(start: string, end: string, timeZone: string): string | null {
  if (!start) return null;
  const on = (t: string) => new Date(`2000-01-01T${t}:00`);
  const clock = (t: string) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    }).format(on(t));

  // en-IN names the zone ("IST") where en-US gives a bare offset for the same
  // zone; for a zone it has no abbreviation for, both give the offset.
  const zone =
    new Intl.DateTimeFormat("en-IN", { timeZone, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? "";

  const range = end ? `${clock(start)} – ${clock(end)}` : clock(start);
  return zone ? `${range} ${zone}` : range;
}

/**
 * The patch to write back.
 *
 * date_label rides along with date because it is a denormalised copy: the
 * listing and the cards read it, so a date changed without it shows the new
 * date in one place and the old one everywhere else.
 *
 * time, starts_at and ends_at ride along with the two time boxes for the same
 * reason. `time` is the line a person reads and starts_at/ends_at are what
 * the structured data and anything scheduling against this event use; they
 * were allowed to disagree before, because only `time` was editable and the
 * timestamps were left wherever they were.
 */
/**
 * Every column that the date and the two time boxes between them decide.
 *
 * Exported because the admin console does not render this form — it has its
 * own, older one, and that is exactly how the two drifted: End date and the
 * structured times were added here and reached hosts only, leaving an admin
 * with a single free-text Time box and no way to say when a course ends.
 * The layouts can stay different; the derivation cannot be written twice.
 */
export function scheduleColumns(form: {
  date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
}): Record<string, unknown> {
  const date = (form.date ?? "").trim();
  const endDate = (form.end_date ?? "").trim();
  const tz = (form.timezone ?? "").trim() || DEFAULT_TZ;
  const start = (form.start_time ?? "").trim();
  const end = (form.end_time ?? "").trim();

  const out: Record<string, unknown> = {
    date: date || null,
    end_date: endDate || null,
    time: timeLabel(start, end, tz),
    starts_at: instant(date, start, tz),
  };

  if (date) {
    out.date_label = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  // An end date means a run of days and the last one is when it ends. Without
  // one, an end before the start is the evening event that finishes after
  // midnight rather than a mistake.
  const endDay = endDate || date;
  out.ends_at = instant(endDay, end, tz);
  if (
    typeof out.ends_at === "string" &&
    typeof out.starts_at === "string" &&
    out.ends_at <= out.starts_at &&
    !endDate
  ) {
    const next = new Date(endDay + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    out.ends_at = instant(next.toISOString().slice(0, 10), end, tz);
  }

  return out;
}

/**
 * The patch to write back.
 *
 * date_label, time, starts_at and ends_at are not fields anybody edits: they
 * are decided by the date and the two time boxes, so scheduleColumns settles
 * all six together. `time` is the line a person reads and starts_at/ends_at
 * are what the structured data and anything scheduling against this event
 * use; they were allowed to disagree before, because only `time` was editable
 * and the timestamps were left wherever they happened to be.
 */
export function formToEvent(form: Record<string, string>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of EVENT_FIELDS) {
    if (f.derived || !f.to) continue;
    patch[f.column ?? f.key] = f.to(form[f.key] ?? "");
  }
  return Object.assign(patch, scheduleColumns(form));
}
