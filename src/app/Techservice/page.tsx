import type { Metadata } from "next";
import { StudioNav } from "@/components/techservice/StudioNav";
import { Hero, Highlights } from "@/components/techservice/Hero";
import { WhatWeDo, Services } from "@/components/techservice/Offering";
import { Work } from "@/components/techservice/Work";
import { Process, Platforms, Engagement } from "@/components/techservice/HowWeWork";
import { WhyTXF, FAQ } from "@/components/techservice/WhyAndFaq";
import { FinalCTA, StartProject } from "@/components/techservice/StartProject";
import { StudioJsonLd } from "@/components/techservice/StudioJsonLd";
import { StudioFooter } from "@/components/techservice/StudioFooter";

export const metadata: Metadata = {
  // Absolute, so the community site's "· Techxfluence" suffix isn't added.
  title: { absolute: "TXF — Design, Development & Digital Experiences" },
  description:
    "TXF designs and develops websites, web apps and brand assets for startups and businesses. We Design. We Develop. We Deliver.",
  alternates: { canonical: "/Techservice" },
  openGraph: {
    title: "TXF — We Design. We Develop. We Deliver.",
    description: "Websites, web apps and digital experiences that move businesses forward.",
    url: "/Techservice",
    type: "website",
  },
};

/**
 * /Techservice — TXF's design & development studio.
 *
 * Section order follows the Figma frame "TXF — Studio Portfolio", with the
 * platforms, engagement models, FAQ and enquiry form added in the same
 * style. Each section lives in components/techservice; copy lives in its
 * data.ts. It is a separate site: Chrome.tsx leaves out the community nav
 * and footer here, and the page brings its own header and footer. The
 * wrapper's scroll margin clears the sticky header.
 */
export default function TechServicePage() {
  return (
    <div id="top" className="bg-surface [&_[id]]:scroll-mt-24">
      <StudioJsonLd />
      <StudioNav />
      <main id="main">
        <Hero />
        <Highlights />
        <WhatWeDo />
        <Services />
        <Work />
        <Process />
        <Platforms />
        <Engagement />
        <WhyTXF />
        <FAQ />
        <FinalCTA />
        <StartProject />
      </main>
      <StudioFooter />
    </div>
  );
}
