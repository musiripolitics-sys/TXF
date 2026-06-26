import type { TXFEvent, EventCategory, Speaker } from "@/lib/data";

/** Shape of an `events` row (plus optional joined speakers) from Supabase. */
export type DBEvent = {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  date_label: string | null;
  time: string | null;
  city: string;
  venue: string;
  address: string | null;
  price_type: string;
  price_label: string | null;
  blurb: string | null;
  about: string | null;
  spots_left: number;
  capacity: number;
  image_url: string | null;
  event_speakers?: {
    sort_order: number;
    speakers: { name: string; role: string | null; initials: string | null } | null;
  }[];
  event_agenda?: {
    sort_order: number;
    when_label: string;
    what: string;
  }[];
};

const categoryImages: Record<string, string> = {
  Meetup: "/events/meetup.jpg",
  Workshop: "/events/workshop.jpg",
  Webinar: "/events/webinar.jpg",
  Hackathon: "/events/hackathon.jpg",
  Conference: "/events/conference.jpg",
  Networking: "/events/networking.jpg",
  "Product Launch": "/events/launch.jpg",
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "TXF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDateLabel(date: string): string {
  try {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

/** Map a Supabase `events` row to the `TXFEvent` shape the UI already uses. */
export function dbEventToTXF(row: DBEvent): TXFEvent {
  const speakers: Speaker[] = (row.event_speakers ?? [])
    .filter((es) => es.speakers)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((es) => ({
      name: es.speakers!.name,
      role: es.speakers!.role ?? "Speaker",
      initials: es.speakers!.initials ?? initialsFor(es.speakers!.name),
    }));

  const agenda = (row.event_agenda ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ea) => ({
      when: ea.when_label,
      what: ea.what,
    }));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category as EventCategory,
    date: row.date,
    dateLabel: row.date_label || formatDateLabel(row.date),
    time: row.time ?? "",
    city: row.city,
    venue: row.venue,
    address: row.address ?? "",
    price: row.price_type === "Paid" ? "Paid" : "Free",
    priceLabel: row.price_label || (row.price_type === "Paid" ? "Paid" : "Free"),
    blurb: row.blurb ?? "",
    about: row.about ?? "",
    spotsLeft: row.spots_left,
    capacity: row.capacity,
    speakers,
    agenda: agenda.length > 0 ? agenda : undefined,
    image: row.image_url ?? categoryImages[row.category] ?? undefined,
  };
}
