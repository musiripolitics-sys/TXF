import { Hero } from "@/components/home/Hero";
import { CategoryBrowse } from "@/components/home/CategoryBrowse";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { StatsBand } from "@/components/home/StatsBand";
import { Membership } from "@/components/home/Membership";
import { Partners } from "@/components/home/Partners";
import { Activities } from "@/components/home/Activities";
import { FinalCTA } from "@/components/home/FinalCTA";

export default function Home() {
  return (
    <>
      <Hero />
      <CategoryBrowse />
      <UpcomingEvents />
      <StatsBand />
      <Membership />
      <Partners />
      <Activities />
      <FinalCTA />
    </>
  );
}
