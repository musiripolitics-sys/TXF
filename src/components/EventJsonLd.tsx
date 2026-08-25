import type { TXFEvent } from "@/lib/data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://techxfluence.com";

/**
 * schema.org/Event structured data. This is what makes an event eligible for
 * Google's event rich results (the card with date + venue in search).
 * Rendered server-side as a JSON-LD script tag.
 */
export function EventJsonLd({
  event,
  startsAt,
  endsAt,
}: {
  event: TXFEvent;
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  const isOnline = event.city?.toLowerCase() === "online";
  const isFree = event.price === "Free";
  const url = `${SITE}/events/${event.slug}`;

  // Cheapest sellable tier drives the advertised price.
  const lowest =
    event.ticketTypes && event.ticketTypes.length > 0
      ? Math.min(...event.ticketTypes.map((t) => t.priceAmount))
      : isFree
        ? 0
        : null;
  const available = event.spotsLeft > 0;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.blurb || event.about,
    url,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    ...(startsAt ? { startDate: startsAt } : { startDate: event.date }),
    ...(endsAt ? { endDate: endsAt } : {}),
    ...(event.image
      ? { image: [event.image.startsWith("http") ? event.image : `${SITE}${event.image}`] }
      : {}),
    location: isOnline
      ? { "@type": "VirtualLocation", url }
      : {
          "@type": "Place",
          name: event.venue,
          address: {
            "@type": "PostalAddress",
            streetAddress: event.address || event.venue,
            addressLocality: event.city,
            addressCountry: "IN",
          },
        },
    organizer: {
      "@type": "Organization",
      name: event.hostName || "Techxfluence",
      url: SITE,
    },
    ...(lowest !== null
      ? {
          offers: {
            "@type": "Offer",
            url,
            price: (lowest / 100).toFixed(2),
            priceCurrency: "INR",
            availability: available
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
          },
        }
      : {}),
    ...(event.speakers.length > 0
      ? {
          performer: event.speakers.map((s) => ({
            "@type": "Person",
            name: s.name,
          })),
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      // Structured data is generated from our own DB, not user HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
