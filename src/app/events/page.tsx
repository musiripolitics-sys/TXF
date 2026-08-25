import type { Metadata } from "next";
import { EventsBrowser } from "@/components/EventsBrowser";
import { getEvents } from "@/lib/events";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Browse and filter upcoming Techxfluence tech events by category, city and price — meetups, workshops, webinars, hackathons and more.",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const [events, { q, category }] = await Promise.all([
    getEvents(),
    searchParams,
  ]);
  return (
    <EventsBrowser
      initialEvents={events}
      initialQuery={q ?? ""}
      initialCategory={category ?? ""}
    />
  );
}
