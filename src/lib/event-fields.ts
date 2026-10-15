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
export type FieldKind = "text" | "textarea" | "date" | "select";

export type EventField = {
  /** The form key, and the events column unless `column` says otherwise. */
  key: string;
  label: string;
  kind: FieldKind;
  column?: string;
  options?: readonly string[];
  hint?: string;
  rows?: number;
  /** Row -> form string. */
  from: (row: Record<string, unknown>) => string;
  /** Form string -> column value. */
  to: (value: string) => unknown;
};

const str = (v: unknown) => (v == null ? "" : String(v));
const trimmedOrNull = (v: string) => (v.trim() ? v.trim() : null);
const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

export const EVENT_FIELDS: EventField[] = [
  { key: "title", label: "Title", kind: "text",
    from: (r) => str(r.title), to: (v) => v.trim() },
  { key: "category", label: "Category", kind: "select", options: eventCategories,
    from: (r) => str(r.category) || "Meetup", to: (v) => v as EventCategory },
  { key: "date", label: "Date", kind: "date",
    from: (r) => str(r.date), to: (v) => v || null },
  { key: "time", label: "Time", kind: "text", hint: "e.g. 10:00 – 11:30 AM IST",
    from: (r) => str(r.time), to: trimmedOrNull },
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
  { key: "highlights", label: "Good to know", kind: "textarea", rows: 4,
    hint: "One per line", column: "highlights",
    from: (r) => (Array.isArray(r.highlights) ? (r.highlights as string[]).join("\n") : ""),
    to: lines },
  { key: "tags", label: "Topics", kind: "text", hint: "Comma separated", column: "tags",
    from: (r) => (Array.isArray(r.tags) ? (r.tags as string[]).join(", ") : ""),
    to: (v) => Array.from(new Set(v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))) },
  { key: "refundPolicy", label: "Refunds & cancellation", kind: "textarea", rows: 3,
    column: "refund_policy",
    from: (r) => str(r.refund_policy), to: trimmedOrNull },
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
 * The patch to write back.
 *
 * date_label rides along with date because it is a denormalised copy: the
 * listing and the cards read it, so a date changed without it shows the new
 * date in one place and the old one everywhere else.
 */
export function formToEvent(form: Record<string, string>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of EVENT_FIELDS) patch[f.column ?? f.key] = f.to(form[f.key] ?? "");
  if (form.date) {
    patch.date_label = new Date(form.date + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  }
  return patch;
}
