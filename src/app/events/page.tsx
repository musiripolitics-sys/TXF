import type { Metadata } from "next";
import { EventsBrowser } from "@/components/EventsBrowser";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Browse and filter upcoming Techxfluence tech events by category, city and price — meetups, workshops, webinars, hackathons and more.",
};

export default function EventsPage() {
  return <EventsBrowser />;
}
