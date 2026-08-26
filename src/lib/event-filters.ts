import { eventCategories, type EventCategory, type TXFEvent } from "@/lib/data";

/**
 * The filter model for the events page.
 *
 * The URL is the source of truth — every filter round-trips through the query
 * string, so a filtered view can be shared, bookmarked and reached with the
 * back button.
 */

export type Dimension = "q" | "cats" | "city" | "price" | "when" | "format" | "tags";
export type Sort = "soon" | "later" | "free";
export type When = "all" | "today" | "weekend" | "month";
export type Format = "all" | "online" | "inperson";

export type Filters = {
  q: string;
  cats: EventCategory[];
  city: string;
  price: "all" | "Free" | "Paid";
  when: When;
  format: Format;
  tags: string[];
  sort: Sort;
};

export const EMPTY: Filters = {
  q: "",
  cats: [],
  city: "all",
  price: "all",
  when: "all",
  format: "all",
  tags: [],
  sort: "soon",
};

export const WHEN_LABELS: Record<Exclude<When, "all">, string> = {
  today: "Today",
  weekend: "This weekend",
  month: "Next 30 days",
};

export const FORMAT_LABELS: Record<Exclude<Format, "all">, string> = {
  inperson: "In person",
  online: "Online",
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * The window a `when` value covers, as [start, endExclusive).
 * "This weekend" means the coming Saturday and Sunday — or the rest of the
 * weekend if you're already in one.
 */
export function whenRange(when: When, now = new Date()): [Date, Date] | null {
  if (when === "all") return null;
  const today = startOfDay(now);

  if (when === "today") {
    return [today, new Date(today.getTime() + 864e5)];
  }
  if (when === "month") {
    return [today, new Date(today.getTime() + 30 * 864e5)];
  }
  // Weekend: Saturday (6) and Sunday (0).
  const dow = today.getDay();
  const daysToSat = dow === 6 ? 0 : dow === 0 ? -1 : 6 - dow;
  const sat = new Date(today.getTime() + daysToSat * 864e5);
  const start = sat < today ? today : sat;
  return [start, new Date(sat.getTime() + 2 * 864e5)];
}

export const isOnline = (e: TXFEvent) => e.city?.trim().toLowerCase() === "online";

/** Tags live on the event once the tags column exists; absent means none. */
export const eventTags = (e: TXFEvent): string[] =>
  ((e as TXFEvent & { tags?: string[] }).tags ?? []).filter(Boolean);

/**
 * Does this event pass the filters?
 *
 * `skip` omits one dimension, which is what makes honest facet counts
 * possible: the count beside "Chennai" is how many events you'd get if you
 * clicked it, i.e. every other filter still applied.
 */
export function matches(
  e: TXFEvent,
  f: Filters,
  skip?: Dimension,
  now = new Date(),
): boolean {
  if (skip !== "cats" && f.cats.length > 0 && !f.cats.includes(e.category)) return false;
  if (skip !== "city" && f.city !== "all" && e.city !== f.city) return false;
  if (skip !== "price" && f.price !== "all" && e.price !== f.price) return false;

  if (skip !== "format" && f.format !== "all") {
    const online = isOnline(e);
    if (f.format === "online" && !online) return false;
    if (f.format === "inperson" && online) return false;
  }

  if (skip !== "when" && f.when !== "all") {
    const range = whenRange(f.when, now);
    if (range) {
      const d = new Date(e.date).getTime();
      if (Number.isNaN(d) || d < range[0].getTime() || d >= range[1].getTime()) return false;
    }
  }

  if (skip !== "tags" && f.tags.length > 0) {
    const own = eventTags(e).map((t) => t.toLowerCase());
    if (!f.tags.every((t) => own.includes(t.toLowerCase()))) return false;
  }

  if (skip !== "q") {
    const q = f.q.trim().toLowerCase();
    if (q !== "") {
      const hay = `${e.title} ${e.city} ${e.venue} ${eventTags(e).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
  }
  return true;
}

export function applyFilters(events: TXFEvent[], f: Filters, now = new Date()): TXFEvent[] {
  const list = events.filter((e) => matches(e, f, undefined, now));
  return [...list].sort((a, b) => {
    if (f.sort === "free") {
      if (a.price === b.price) return 0;
      return a.price === "Free" ? -1 : 1;
    }
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return f.sort === "soon" ? da - db : db - da;
  });
}

/** Which dimensions are currently narrowing the list. */
export function activeDimensions(f: Filters): Dimension[] {
  const out: Dimension[] = [];
  if (f.q.trim() !== "") out.push("q");
  if (f.cats.length > 0) out.push("cats");
  if (f.city !== "all") out.push("city");
  if (f.price !== "all") out.push("price");
  if (f.when !== "all") out.push("when");
  if (f.format !== "all") out.push("format");
  if (f.tags.length > 0) out.push("tags");
  return out;
}

export const hasFilters = (f: Filters) => activeDimensions(f).length > 0;

export function clearDimension(f: Filters, d: Dimension): Filters {
  switch (d) {
    case "q": return { ...f, q: "" };
    case "cats": return { ...f, cats: [] };
    case "city": return { ...f, city: "all" };
    case "price": return { ...f, price: "all" };
    case "when": return { ...f, when: "all" };
    case "format": return { ...f, format: "all" };
    case "tags": return { ...f, tags: [] };
  }
}

/**
 * When a combination returns nothing, work out which single filter to drop to
 * recover the most events. A dead end should always offer a way out.
 */
export function bestRecovery(
  events: TXFEvent[],
  f: Filters,
  now = new Date(),
): { dimension: Dimension; filters: Filters; count: number } | null {
  const dims = activeDimensions(f);
  if (dims.length === 0) return null;

  let best: { dimension: Dimension; filters: Filters; count: number } | null = null;
  for (const d of dims) {
    const relaxed = clearDimension(f, d);
    const count = events.filter((e) => matches(e, relaxed, undefined, now)).length;
    if (count > 0 && (!best || count > best.count)) {
      best = { dimension: d, filters: relaxed, count };
    }
  }
  return best;
}

export const DIMENSION_LABELS: Record<Dimension, string> = {
  q: "search",
  cats: "category",
  city: "city",
  price: "price",
  when: "date",
  format: "format",
  tags: "tags",
};

// ---------- URL <-> Filters ----------

export function fromParams(p: URLSearchParams): Filters {
  const list = (key: string) =>
    (p.get(key) ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const cats = list("category").filter((c): c is EventCategory =>
    eventCategories.includes(c as EventCategory),
  );
  const price = p.get("price");
  const when = p.get("when");
  const format = p.get("format");
  const sort = p.get("sort");

  return {
    q: p.get("q") ?? "",
    cats,
    city: p.get("city") || "all",
    price: price === "Free" || price === "Paid" ? price : "all",
    when: when === "today" || when === "weekend" || when === "month" ? when : "all",
    format: format === "online" || format === "inperson" ? format : "all",
    tags: list("tag"),
    sort: sort === "later" || sort === "free" ? sort : "soon",
  };
}

/** Only non-default values are written, so a clean view has a clean URL. */
export function toParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.cats.length) p.set("category", f.cats.join(","));
  if (f.city !== "all") p.set("city", f.city);
  if (f.price !== "all") p.set("price", f.price);
  if (f.when !== "all") p.set("when", f.when);
  if (f.format !== "all") p.set("format", f.format);
  if (f.tags.length) p.set("tag", f.tags.join(","));
  if (f.sort !== "soon") p.set("sort", f.sort);
  return p;
}
