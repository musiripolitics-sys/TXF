import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { Section, SectionHeading } from "@/components/Section";
import { stats } from "@/lib/data";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Techxfluence is a technology community and event ecosystem connecting students, professionals, startups and organizations across India.",
};

const values = [
  {
    title: "Community first",
    desc: "Everything we build starts with the people in the room. Belonging beats vanity metrics.",
  },
  {
    title: "Learn by building",
    desc: "We favour hands-on hackathons, workshops and demos over passive talks.",
  },
  {
    title: "Open & inclusive",
    desc: "Students to senior engineers, every city, every background — there's a seat for you.",
  },
  {
    title: "Give before you take",
    desc: "Mentorship, intros and knowledge flow freely. Contribution is the currency.",
  },
];

const milestones = [
  { year: "Year 1", goal: "1,000 members", note: "Establish chapters across Tamil Nadu." },
  { year: "Year 2", goal: "5,000 members", note: "Expand to metros and flagship hackathons." },
  { year: "Year 3", goal: "15,000 members", note: "National presence and partner ecosystem." },
];

export default function AboutPage() {
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-ink-2">
        <div className="pointer-events-none absolute inset-0 glow-brand" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <span className="text-xs font-medium uppercase tracking-wider text-brand-soft">
            About Techxfluence
          </span>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl text-balance">
            We connect technology with influence
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted text-balance">
            Techxfluence is a technology community and event ecosystem bringing
            together developers, entrepreneurs, startups, students, creators and
            tech enthusiasts through impactful events, networking and
            collaborative learning.
          </p>
        </div>
      </header>

      {/* Mission / Vision */}
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-7 shadow-soft">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-brand-soft">
              Our Mission
            </h2>
            <p className="mt-3 text-lg text-fg">
              To create a thriving technology ecosystem where people connect,
              learn, build and grow together.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-7 shadow-soft">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-brand-soft">
              Our Vision
            </h2>
            <p className="mt-3 text-lg text-fg">
              To become India&apos;s most influential technology community
              platform — a tribe of innovators building the future.
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface px-4 py-6 text-center">
              <dt className="font-display text-2xl font-bold text-fg sm:text-3xl">
                {s.value}
              </dt>
              <dd className="mt-1 text-xs text-muted">{s.label}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Values */}
      <div className="border-y border-line bg-ink-2">
        <Section>
          <SectionHeading eyebrow="What we stand for" title="Our values" />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <h3 className="font-display text-base font-semibold text-fg">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{v.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Roadmap */}
      <Section>
        <SectionHeading
          eyebrow="Where we're headed"
          title="The three-year plan"
          description="A clear path from a Chennai community to a national technology ecosystem."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {milestones.map((m) => (
            <div
              key={m.year}
              className="rounded-2xl border border-line bg-surface p-6 shadow-soft"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-faint">
                {m.year}
              </span>
              <p className="mt-2 font-display text-2xl font-bold text-fg">
                {m.goal}
              </p>
              <p className="mt-2 text-sm text-muted">{m.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-14 text-center shadow-soft sm:px-12">
          <div className="pointer-events-none absolute inset-0 glow-brand" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl text-balance">
              Build the future with us
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted text-balance">
              Join 5,000+ builders across India. Attend events, host your own,
              and grow with a community that gives before it takes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/membership" variant="brand" size="lg">
                Become a Member
              </Button>
              <Button href="/contact" variant="outline" size="lg">
                Get in touch
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
