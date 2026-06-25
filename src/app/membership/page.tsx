import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Section, SectionHeading } from "@/components/Section";
import { tiers, memberBenefits } from "@/lib/data";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Free, Pro and Elite Techxfluence membership tiers. Free event access, priority registration, workshops, mentorship and recognition.",
};

export default function MembershipPage() {
  return (
    <>
      <header className="border-b border-line bg-ink-2">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8">
          <span className="text-xs font-medium uppercase tracking-wider text-brand-soft">
            Membership Program
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl text-balance">
            Pick the plan that matches your ambition
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted text-balance">
            From getting plugged in to leading the community — every tier is
            built so showing up pays off.
          </p>
        </div>
      </header>

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-3xl border p-7 ${
                tier.highlight
                  ? "border-brand bg-surface shadow-[0_20px_60px_-20px_rgba(255,106,26,0.45)]"
                  : "border-line bg-surface"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h2 className="font-display text-lg font-semibold text-fg">
                {tier.name}
              </h2>
              <p className="mt-1 text-sm text-muted">{tier.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-fg">
                  {tier.price}
                </span>
                <span className="text-sm text-faint">/ {tier.cadence}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2.5 text-sm text-muted"
                  >
                    <Icon
                      name="check"
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        tier.highlight ? "text-brand" : "text-host"
                      }`}
                      strokeWidth={2.2}
                    />
                    {perk}
                  </li>
                ))}
              </ul>

              <Button
                href="/events"
                variant={tier.highlight ? "brand" : "outline"}
                size="lg"
                className="mt-7 w-full"
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-faint">
          Volunteer &amp; Community Ambassador roles are also open — apply from
          within any tier.
        </p>
      </Section>

      <div className="border-t border-line bg-ink-2">
        <Section>
          <SectionHeading
            eyebrow="What's included"
            title="Benefits across every tier"
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {memberBenefits.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand/40"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon name={b.icon} className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-fg">
                  {b.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted">{b.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
