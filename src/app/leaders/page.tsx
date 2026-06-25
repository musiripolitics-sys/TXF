import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { Section, SectionHeading } from "@/components/Section";
import { LeaderTeamCard } from "@/components/LeaderTeamCard";
import { OrgTree, type Org } from "@/components/OrgTree";
import { leaders } from "@/lib/data";

export const metadata: Metadata = {
  title: "Leaders",
  description:
    "Meet the Techxfluence leaders — founder, directors, coordinators, ambassadors and mentors — and see how the community is structured.",
};

const ranked = leaders
  .filter((l) => !l.isHiring)
  .sort((a, b) => b.points - a.points);
const byName = Object.fromEntries(leaders.map((l) => [l.name, l]));

// Reporting hierarchy: Founder → Directors (Community Leads) → teams.
const org: Org = {
  leader: byName["Kumaresan"],
  directors: [
    {
      leader: byName["Mahalakshmi"],
      reports: [
        byName["Open Coordinator (Chennai)"],
        byName["Open Ambassador (Chennai)"],
        byName["Open Mentor (Chennai)"],
      ],
    },
    {
      leader: byName["Abishek"],
      reports: [
        byName["Open Coordinator (Bengaluru)"],
        byName["Open Ambassador (Bengaluru)"],
        byName["Open Mentor (Bengaluru)"],
      ],
    },
  ],
};

const summary = [
  { value: `${leaders.length}`, label: "Community Leaders" },
  {
    value: `${new Set(leaders.map((l) => l.city)).size}`,
    label: "Cities Represented",
  },
  { value: `${leaders.reduce((s, l) => s + l.events, 0)}+`, label: "Events Led" },
  {
    value: `${Math.round(leaders.reduce((s, l) => s + l.points, 0) / 1000)}K+`,
    label: "Contribution Points",
  },
];

export default function LeadersPage() {
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-ink-2">
        <div className="pointer-events-none absolute inset-0 glow-brand" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <span className="text-xs font-medium uppercase tracking-wider text-brand-soft">
            Leadership Board
          </span>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl text-balance">
            The people behind Techxfluence
          </h1>
          <p className="mt-4 max-w-2xl text-muted text-balance">
            Founder, directors, coordinators, ambassadors and mentors — the
            volunteers who show up, host events and grow the tribe.
          </p>

          <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
            {summary.map((s) => (
              <div key={s.label} className="bg-surface px-4 py-5 text-center">
                <dt className="font-display text-2xl font-bold text-fg">
                  {s.value}
                </dt>
                <dd className="mt-1 text-xs text-muted">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* Black & white team grid */}
      <Section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            Meet our leaders
          </h2>
          <a
            href="#structure"
            className="hidden shrink-0 text-sm font-medium text-muted transition-colors hover:text-fg sm:block"
          >
            See the team structure →
          </a>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {leaders.map((leader) => (
            <LeaderTeamCard key={leader.name} leader={leader} />
          ))}
        </div>
      </Section>

      {/* Org hierarchy / tree */}
      <div id="structure" className="scroll-mt-20 border-y border-line bg-ink-2">
        <Section>
          <SectionHeading
            eyebrow="How we're organised"
            title="The community structure"
            description="From the founder down to city ambassadors and mentors — here's how Techxfluence is led."
          />
          <div className="mt-12">
            <OrgTree org={org} />
          </div>
        </Section>
      </div>

      {/* Leaderboard */}
      <Section>
        <SectionHeading
          align="left"
          eyebrow="Top Contributors"
          title="This month's leaderboard"
          description="Points are earned by hosting events, mentoring, volunteering and growing the community."
        />
        <div className="mt-10 overflow-hidden rounded-2xl border border-line shadow-soft">
          <div className="hidden grid-cols-[0.5fr_2.5fr_1.5fr_1fr_1fr] gap-4 border-b border-line bg-ink-2 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-faint sm:grid">
            <span>#</span>
            <span>Member</span>
            <span>Role</span>
            <span className="text-right">Events</span>
            <span className="text-right">Points</span>
          </div>
          {ranked.map((l, i) => (
            <div
              key={l.name}
              className="grid grid-cols-2 items-center gap-4 border-b border-line bg-surface px-6 py-4 last:border-0 sm:grid-cols-[0.5fr_2.5fr_1.5fr_1fr_1fr]"
            >
              <span className="hidden font-display text-sm font-semibold text-faint sm:block">
                {i + 1}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-join text-sm font-bold text-white">
                  {l.initials}
                </span>
                <div>
                  <p className="font-medium text-fg">{l.name}</p>
                  <p className="text-xs text-faint">{l.city}</p>
                </div>
              </div>
              <span className="text-sm text-muted">{l.role}</span>
              <span className="text-right text-sm text-fg">
                <span className="text-faint sm:hidden">Events: </span>
                {l.events}
              </span>
              <span className="text-right text-sm font-semibold text-brand-soft">
                {l.points.toLocaleString()}
              </span>
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
              Want to lead the community?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted text-balance">
              Volunteers and Community Ambassadors help organize events, grow
              chapters and represent Techxfluence. Every leader started as a
              member who showed up.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/membership" variant="brand" size="lg">
                Become an Ambassador
              </Button>
              <Button href="/legal/handbook" variant="outline" size="lg">
                Read the handbook
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
