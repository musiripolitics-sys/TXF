import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Section, SectionHeading } from "@/components/Section";
import { getMemberBenefits, getTiers } from "@/lib/content";
import { MembershipTiers } from "@/components/MembershipTiers";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Free, Pro and Elite Techxfluence membership tiers. Free event access, priority registration, workshops, mentorship and recognition.",
};

export default async function MembershipPage() {
  const [memberBenefits, tiers] = await Promise.all([
    getMemberBenefits(),
    getTiers(),
  ]);

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
        <MembershipTiers tiers={tiers} />
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
