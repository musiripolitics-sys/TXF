// src/lib/data.ts
var eventCategories = [
  "Meetup",
  "Workshop",
  "Webinar",
  "Hackathon",
  "Conference",
  "Networking",
  "Product Launch"
];

// src/lib/event-filters.ts
var EMPTY = {
  q: "",
  cats: [],
  city: "all",
  price: "all",
  when: "all",
  format: "all",
  tags: [],
  sort: "soon"
};
var WHEN_LABELS = {
  today: "Today",
  weekend: "This weekend",
  month: "Next 30 days"
};
var FORMAT_LABELS = {
  inperson: "In person",
  online: "Online"
};
var startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
function whenRange(when, now = /* @__PURE__ */ new Date()) {
  if (when === "all") return null;
  const today = startOfDay(now);
  if (when === "today") {
    return [today, new Date(today.getTime() + 864e5)];
  }
  if (when === "month") {
    return [today, new Date(today.getTime() + 30 * 864e5)];
  }
  const dow = today.getDay();
  const daysToSat = dow === 6 ? 0 : dow === 0 ? -1 : 6 - dow;
  const sat = new Date(today.getTime() + daysToSat * 864e5);
  const start = sat < today ? today : sat;
  return [start, new Date(sat.getTime() + 2 * 864e5)];
}
var isOnline = (e) => e.city?.trim().toLowerCase() === "online";
var eventTags = (e) => (e.tags ?? []).filter(Boolean);
function matches(e, f, skip, now = /* @__PURE__ */ new Date()) {
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
function applyFilters(events, f, now = /* @__PURE__ */ new Date()) {
  const list = events.filter((e) => matches(e, f, void 0, now));
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
function activeDimensions(f) {
  const out = [];
  if (f.q.trim() !== "") out.push("q");
  if (f.cats.length > 0) out.push("cats");
  if (f.city !== "all") out.push("city");
  if (f.price !== "all") out.push("price");
  if (f.when !== "all") out.push("when");
  if (f.format !== "all") out.push("format");
  if (f.tags.length > 0) out.push("tags");
  return out;
}
var hasFilters = (f) => activeDimensions(f).length > 0;
function clearDimension(f, d) {
  switch (d) {
    case "q":
      return { ...f, q: "" };
    case "cats":
      return { ...f, cats: [] };
    case "city":
      return { ...f, city: "all" };
    case "price":
      return { ...f, price: "all" };
    case "when":
      return { ...f, when: "all" };
    case "format":
      return { ...f, format: "all" };
    case "tags":
      return { ...f, tags: [] };
  }
}
function bestRecovery(events, f, now = /* @__PURE__ */ new Date()) {
  const dims = activeDimensions(f);
  if (dims.length === 0) return null;
  let best = null;
  for (const d of dims) {
    const relaxed = clearDimension(f, d);
    const count = events.filter((e) => matches(e, relaxed, void 0, now)).length;
    if (count > 0 && (!best || count > best.count)) {
      best = { dimension: d, filters: relaxed, count };
    }
  }
  return best;
}
var DIMENSION_LABELS = {
  q: "search",
  cats: "category",
  city: "city",
  price: "price",
  when: "date",
  format: "format",
  tags: "tags"
};
function fromParams(p) {
  const list = (key) => (p.get(key) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const cats = list("category").filter(
    (c) => eventCategories.includes(c)
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
    sort: sort === "later" || sort === "free" ? sort : "soon"
  };
}
function toParams(f) {
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
export {
  DIMENSION_LABELS,
  EMPTY,
  FORMAT_LABELS,
  WHEN_LABELS,
  activeDimensions,
  applyFilters,
  bestRecovery,
  clearDimension,
  eventTags,
  fromParams,
  hasFilters,
  isOnline,
  matches,
  toParams,
  whenRange
};
