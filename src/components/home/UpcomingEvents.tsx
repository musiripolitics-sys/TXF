import { Section, SectionHeading } from "@/components/Section";
import { EventPosterCard } from "@/components/EventPosterCard";
import { Button } from "@/components/Button";
import { events } from "@/lib/data";

export function UpcomingEvents() {
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

      <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {events.slice(0, 4).map((event) => (
          <EventPosterCard key={event.slug} event={event} />
        ))}
      </div>
    </Section>
  );
}
