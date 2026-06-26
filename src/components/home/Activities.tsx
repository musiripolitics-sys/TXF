import { Section, SectionHeading } from "@/components/Section";
import { impactSteps } from "@/lib/data";
import { getActivities } from "@/lib/content";

const accentMap: Record<string, string> = {
  brand: "border-brand/40 bg-brand/5 text-brand-soft",
  join: "border-join/40 bg-join/5 text-join-soft",
  host: "border-host/40 bg-host/5 text-host-soft",
};

export async function Activities() {
  const activities = await getActivities();
  return (
    <div className="relative overflow-hidden border-y border-line bg-ink-2">
      <Section id="activities" className="relative z-10">
      <SectionHeading
        eyebrow="Our Activities"
        title="What we do"
        description="Meetups, hackathons, workshops and more — the rituals that keep the community building."
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((a) => (
          <div
            key={a.title}
            className={`rounded-2xl border bg-surface p-6 ${accentMap[a.accent]}`}
          >
            <h3 className="font-display text-lg font-semibold text-fg">
              {a.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Community impact flow */}
      <div className="mt-16 rounded-2xl border border-line bg-surface p-8 shadow-soft">
        <h3 className="text-center font-display text-sm font-semibold uppercase tracking-wider text-faint">
          Community Impact
        </h3>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-4">
          {impactSteps.map((step, i) => (
            <div key={step.title} className="flex items-center gap-3">
              <div className="text-center">
                <p className="font-display font-semibold text-fg">
                  {step.title}
                </p>
                <p className="text-xs text-faint">{step.sub}</p>
              </div>
              {i < impactSteps.length - 1 && (
                <span className="text-brand" aria-hidden>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      </Section>
    </div>
  );
}
