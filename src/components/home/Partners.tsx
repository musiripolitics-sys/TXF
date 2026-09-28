import { Section, SectionHeading } from "@/components/Section";
import { partnerTypes } from "@/lib/data";
import { getPartners } from "@/lib/content";

export async function Partners() {
  const partners = await getPartners();

  // "Trusted by amazing partners" with no partners is worse than no section at
  // all, and an empty marquee left a blank band on the homepage. Real partners
  // come from the `partners` table; until there is one, this renders nothing.
  if (partners.length === 0) return null;

  // Duplicate the list so the marquee loops seamlessly.
  const row = [...partners, ...partners];

  return (
    <Section id="partners">
      <SectionHeading
        eyebrow="Our Partners"
        title="Trusted by amazing partners & sponsors"
        description="Technology companies, startups, communities, colleges and media partners power the ecosystem."
      />

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {partnerTypes.map((t) => (
          <span
            key={t}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="relative mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-4">
          {row.map((p, i) => (
            <div
              key={`${p}-${i}`}
              className="flex h-16 w-44 shrink-0 items-center justify-center rounded-xl border border-line bg-surface font-display text-sm font-semibold text-muted"
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
