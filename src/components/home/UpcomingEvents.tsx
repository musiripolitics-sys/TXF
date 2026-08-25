import { Section, SectionHeading } from "@/components/Section";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/Button";
import { getEvents } from "@/lib/events";

export async function UpcomingEvents() {
  const events = await getEvents();
  
  return (
    <Section id="events">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <SectionHeading
          align="left"
          eyebrow="Upcoming Events"
          title="Find your next room full of builders"
          description="Filter by city, category, date or price on the events page. Here's what's coming up next."
        />
        <Button href="/events" variant="outline" size="md" className="shrink-0">
          Browse all events →
        </Button>
      </div>

      {events.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 6).map((event) => (
            <EventCard key={event.slug} event={event} />
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <p className="font-display text-lg text-fg">No upcoming events scheduled.</p>
          <p className="mt-1 text-sm text-muted">
            New events drop every week. Join membership to get notified.
          </p>
        </div>
      )}
    </Section>
  );
}
