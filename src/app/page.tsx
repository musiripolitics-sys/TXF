import { Hero } from "@/components/home/Hero";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { StatsBand } from "@/components/home/StatsBand";
import { Membership } from "@/components/home/Membership";
import { Leadership } from "@/components/home/Leadership";
import { Partners } from "@/components/home/Partners";
import { Activities } from "@/components/home/Activities";
import { FinalCTA } from "@/components/home/FinalCTA";

export default function Home() {
  return (
    <>
      <Hero />
      <UpcomingEvents />
      <StatsBand />
      <Membership />
      <Leadership />
      <Partners />
      <Activities />
      <FinalCTA />
    </>
  );
}
