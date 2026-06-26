import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { Section, SectionHeading } from "@/components/Section";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join the Techxfluence team. We're building India's most influential technology community — come help us connect technology with influence.",
};

const perks = [
  {
    title: "Build in public",
    desc: "Your work ships to a growing community of builders. Real impact, real audience, from week one.",
  },
  {
    title: "Learn relentlessly",
    desc: "Front-row access to every hackathon, workshop and demo. We invest in how you grow, not just what you ship.",
  },
  {
    title: "Own your scope",
    desc: "Small team, big surface area. You'll own meaningful problems end to end instead of slivers of a backlog.",
  },
  {
    title: "Community first",
    desc: "We hire people who give before they take. Mentorship and intros flow freely, internally and out.",
  },
];

type Role = {
  title: string;
  type: string;
  location: string;
  desc: string;
};

const roles: Role[] = [
  {
    title: "Community Manager",
    type: "Full-time",
    location: "Chennai / Hybrid",
    desc: "Grow and energise our chapters — run events, nurture members, and turn first-timers into regulars.",
  },
  {
    title: "Frontend Engineer",
    type: "Full-time",
    location: "Remote (India)",
    desc: "Own the web experience across our event and membership platform. React, Next.js and a sharp eye for craft.",
  },
  {
    title: "Events & Partnerships Lead",
    type: "Full-time",
    location: "Chennai",
    desc: "Design flagship hackathons and land the partners and sponsors that make them unforgettable.",
  },
  {
    title: "Content & Social Creator",
    type: "Part-time / Contract",
    location: "Remote (India)",
    desc: "Tell our story across platforms — recaps, reels, threads and everything that makes the community feel alive.",
  },
];

export default function CareersPage() {
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-ink-2">
        <div className="pointer-events-none absolute inset-0 glow-brand" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <span className="text-xs font-medium uppercase tracking-wider text-brand-soft">
            Careers at Techxfluence
          </span>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl text-balance">
            Help us connect technology with influence
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted text-balance">
            We&apos;re a small, fast-moving team building India&apos;s most
            influential technology community. If you love events, builders and
            the energy of a room full of makers, you&apos;ll feel at home here.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="#open-roles" variant="brand" size="lg">
              See open roles
            </Button>
            <Button href="/about" variant="outline" size="lg">
              Learn about us
            </Button>
          </div>
        </div>
      </header>

      {/* Why join */}
      <Section>
        <SectionHeading
          eyebrow="Why join us"
          title="A place to do your best work"
          description="We keep the team lean and the ownership high. Here's what you can expect."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <h3 className="font-display text-base font-semibold text-fg">
                {p.title}
              </h3>
              <p className="mt-2 text-sm text-muted">{p.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Open roles */}
      <div className="border-y border-line bg-ink-2">
        <Section id="open-roles">
          <SectionHeading
            eyebrow="Open roles"
            title="Where you can make an impact"
            description="Don't see a perfect fit? We still want to hear from you — reach out below."
          />
          <div className="mt-12 grid gap-4">
            {roles.map((r) => (
              <div
                key={r.title}
                className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-fg">
                      {r.title}
                    </h3>
                    <span className="rounded-full border border-line bg-ink-2 px-2.5 py-0.5 text-xs font-medium text-muted">
                      {r.type}
                    </span>
                    <span className="rounded-full border border-line bg-ink-2 px-2.5 py-0.5 text-xs font-medium text-muted">
                      {r.location}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{r.desc}</p>
                </div>
                <Button
                  href={`/contact?role=${encodeURIComponent(r.title)}`}
                  variant="outline"
                  size="md"
                  className="shrink-0"
                >
                  Apply
                </Button>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* CTA */}
      <Section>
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-14 text-center shadow-soft sm:px-12">
          <div className="pointer-events-none absolute inset-0 glow-brand" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl text-balance">
              Don&apos;t see your role?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted text-balance">
              We&apos;re always looking for exceptional people. Tell us what
              you&apos;d love to work on and how you&apos;d move the community
              forward.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/contact" variant="brand" size="lg">
                Get in touch
              </Button>
              <Button href="/membership" variant="outline" size="lg">
                Become a Member
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
