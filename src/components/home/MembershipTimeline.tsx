import { Icon } from "@/components/Icon";
import { type MemberBenefit, type Tier } from "@/lib/data";
import { getMemberBenefits, getTiers } from "@/lib/content";

export async function MembershipTimeline() {
  const [benefits, tiers] = await Promise.all([getMemberBenefits(), getTiers()]);
  const featured = benefits[0];
  const rest = benefits.slice(1);

  return (
    <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-3">
      {featured && <FeaturedCard perk={featured} tiers={tiers} />}
      {rest.map((perk) => (
        <PerkCard key={perk.title} perk={perk} />
      ))}
    </div>
  );
}

function FeaturedCard({ perk, tiers }: { perk: MemberBenefit; tiers: Tier[] }) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-3xl border border-brand/30 bg-surface p-7 shadow-soft sm:col-span-2 lg:col-span-1 lg:row-span-2">
      {/* tasteful brand accent — soft corner glow, not a full gradient bg */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/15 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Icon name={perk.icon} className="h-7 w-7" />
          </span>
          <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
            Most loved
          </span>
        </div>

        <h3 className="mt-6 font-display text-2xl font-bold tracking-tight text-fg">
          {perk.title}
        </h3>
        <p className="mt-3 text-muted">{perk.desc}</p>

        <div className="mt-auto pt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-faint">
            Included across every tier
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tiers.map((t) => (
              <span
                key={t.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-3 py-1 text-xs font-medium text-fg"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-host" />
                {t.name.replace(" Member", "")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function PerkCard({ perk }: { perk: MemberBenefit }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110">
          <Icon name={perk.icon} className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-ink-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-faint">
          {perk.tag}
        </span>
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-fg">
        {perk.title}
      </h3>
      <p className="mt-1.5 text-sm text-muted">{perk.desc}</p>
    </article>
  );
}
