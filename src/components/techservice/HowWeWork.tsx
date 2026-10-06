import { Button } from "@/components/Button";
import { Container, Heading, pad } from "./ui";
import { Reveal } from "./Reveal";
import { engagements, platforms, processSteps, START } from "./data";

/** Figma: Process — five boxed steps joined by arrows, the last in orange. */
export function Process() {
  return (
    <section id="process" className="bg-surface py-20 sm:py-28">
      <Container>
        <Heading eyebrow="Our process" title="From idea to impact, in five steps." />

        <ol className="mt-14 grid gap-3 sm:grid-cols-2 lg:flex lg:items-stretch lg:justify-center lg:gap-0">
          {processSteps.map((s, i) => {
            const last = i === processSteps.length - 1;
            return (
              <li key={s.title} className={`flex items-center ${last ? "sm:col-span-2 lg:col-span-1" : ""}`}>
                <Reveal className="h-full w-full lg:w-[196px]">
                  <div
                    className={`flex h-full flex-col gap-1.5 rounded-[18px] border px-6 py-[22px] ${
                      last ? "border-brand bg-brand text-white" : "border-line bg-ink text-fg"
                    }`}
                  >
                    <span className={`font-display text-sm font-bold ${last ? "text-white/80" : "text-brand"}`}>
                      {pad(i)}
                    </span>
                    <h3 className="font-display text-[22px] font-medium tracking-[-0.01em]">{s.title}</h3>
                    <p className={`text-sm leading-[1.45] ${last ? "text-white/85" : "text-muted"}`}>{s.desc}</p>
                  </div>
                </Reveal>
                {!last && (
                  <span className="hidden px-3 text-[22px] text-faint lg:block" aria-hidden>
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ol>

      </Container>
    </section>
  );
}

/**
 * Platforms — deliberately not a "our stack" list. We work across the market
 * and recommend what fits; the chips are examples, ending in "and more".
 */
export function Platforms() {
  return (
    <section id="platforms" className="border-t border-line bg-ink py-20 sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Heading
              align="left"
              eyebrow="Platforms & technologies"
              title="Any platform. The right one for you."
              sub="We work across every major platform on the market — no-code, CMS, e-commerce or fully custom. Tell us what you need and we’ll recommend the one that fits your requirements, budget and team."
            />
            <ul className="mt-8 space-y-3 text-[15px] text-fg">
              {[
                "Platform-agnostic — we never force one stack",
                "Recommendation explained before you commit",
                "Already on a platform? We work with what you have",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <Button href={START} variant="brand" size="lg" className="mt-9">
              Find the right platform <span aria-hidden>→</span>
            </Button>
          </div>

          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              {platforms.map((g) => (
                <Reveal key={g.group} className="h-full">
                  <div className="h-full rounded-[20px] border border-line bg-surface p-6">
                    <h3 className="font-display text-lg font-medium text-fg">{g.group}</h3>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {g.items.map((t) => (
                        <li key={t} className="rounded-full border border-line bg-ink px-3 py-1.5 text-[13px] text-fg">
                          {t}
                        </li>
                      ))}
                      <li className="rounded-full px-1 py-1.5 text-[13px] text-faint">+ more</li>
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted">
              Examples, not a limit — if it&rsquo;s on the market, we can work with it.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Ways to work together — styled like the What We Do cards. No prices. */
export function Engagement() {
  return (
    <section id="engage" className="border-t border-line bg-surface py-20 sm:py-28">
      <Container>
        <Heading
          eyebrow="Ways to work together"
          title="Pick the model that fits your stage."
          sub="Every engagement is scoped and quoted for you — no packages that don’t fit."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {engagements.map((e) => (
            <Reveal key={e.name} className="h-full">
              <article
                className={`relative flex h-full flex-col rounded-[20px] border bg-surface p-7 ${
                  e.featured ? "border-2 border-brand" : "border-line"
                }`}
              >
                {e.featured && (
                  <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                    Best for products
                  </span>
                )}
                <h3 className="font-display text-[28px] font-medium tracking-[-0.01em] text-fg">{e.name}</h3>
                <p className="mt-2 text-[15px] leading-[1.55] text-muted">{e.tagline}</p>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Best for</p>
                <p className="mt-1 text-[15px] font-medium text-fg">{e.bestFor}</p>
                <ul className="mt-6 flex-1 space-y-2.5 border-t border-line pt-6 text-sm leading-[1.5] text-muted">
                  {e.points.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <span className="text-brand" aria-hidden>
                        →
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <Button
                  href={START}
                  variant={e.featured ? "brand" : "outline"}
                  size="md"
                  className={`mt-8 w-full ${e.featured ? "" : "!border-fg/20 hover:!border-fg hover:!text-fg"}`}
                >
                  Get a proposal
                </Button>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
