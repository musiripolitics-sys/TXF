import { Container, Heading, NumberBadge, pad } from "./ui";
import { Reveal } from "./Reveal";
import { Button } from "@/components/Button";
import { capabilities, services, START } from "./data";

/** Figma: What We Do — three cards, the middle one dark. */
export function WhatWeDo() {
  return (
    <section id="what-we-do" className="border-y border-line bg-ink py-20 sm:py-28">
      <Container>
        <Heading
          eyebrow="What we do"
          title="Design meets Technology."
          sub="Three capabilities, one team — so your brand, product and website move together."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {capabilities.map((c, i) => {
            const dark = i === 1;
            return (
              <Reveal key={c.n} className="h-full">
                <article
                  className={`flex h-full flex-col gap-3.5 rounded-[20px] border p-7 transition-transform duration-300 hover:-translate-y-1 ${
                    dark ? "border-[#141416] bg-[#141416] text-white" : "border-line bg-surface text-fg"
                  }`}
                >
                  <NumberBadge n={c.n} onDark={dark} />
                  <h3 className="mt-1 font-display text-[28px] font-medium tracking-[-0.01em]">{c.title}</h3>
                  <p className={`text-[15px] leading-[1.55] ${dark ? "text-[#b4b4bc]" : "text-muted"}`}>{c.desc}</p>
                  <hr className={`my-1 border-0 border-t ${dark ? "border-white/15" : "border-line"}`} />
                  <ul className={`space-y-2.5 text-sm leading-[1.5] ${dark ? "text-[#b4b4bc]" : "text-muted"}`}>
                    {c.points.map((p) => (
                      <li key={p} className="flex gap-2.5">
                        <span className="text-brand" aria-hidden>
                          →
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/** Figma: Services — eight separate cards, numbered. */
export function Services() {
  return (
    <section id="services" className="bg-surface py-20 sm:py-28">
      <Container>
        <Heading eyebrow="Services" title="Everything your digital presence needs." />

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <li key={s.title}>
              <Reveal className="h-full">
                <article className="group flex h-full flex-col gap-3.5 rounded-[20px] border border-line bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-soft">
                  <NumberBadge n={pad(i)} />
                  <h3 className="mt-1 font-display text-[22px] font-medium leading-[1.2] tracking-[-0.01em] text-fg">
                    {s.title}
                  </h3>
                  <p className="text-[15px] leading-[1.55] text-muted">{s.desc}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>

        {/* The eight are the core, not the boundary. */}
        <div className="mt-6 flex flex-col items-start justify-between gap-5 rounded-[20px] border border-dashed border-brand/40 bg-[#fff8f4] p-6 sm:flex-row sm:items-center sm:p-7">
          <div>
            <p className="font-display text-[22px] font-medium tracking-[-0.01em] text-fg">Don&rsquo;t see what you need?</p>
            <p className="mt-1.5 text-[15px] leading-[1.55] text-muted">
              These are our core services, not the limit. If it lives on the web, we can design and build it.
            </p>
          </div>
          <Button
            href={START}
            variant="outline"
            size="md"
            className="shrink-0 !border-fg/20 hover:!border-fg hover:!text-fg"
          >
            Tell us about it →
          </Button>
        </div>
      </Container>
    </section>
  );
}
