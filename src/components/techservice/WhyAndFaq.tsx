import { Button } from "@/components/Button";
import { Container, Eyebrow, Heading, pad } from "./ui";
import { Reveal } from "./Reveal";
import { faqs, reasons, START } from "./data";

/** Figma: Why TXF — dark section, statement left, four reasons right. */
export function WhyTXF() {
  return (
    <section id="why-txf" className="bg-[#141416] py-20 text-white sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="lg:sticky lg:top-40 lg:self-start">
          <Eyebrow dark>Why TXF</Eyebrow>
          <h2 className="mt-6 max-w-[540px] font-display text-[38px] font-bold leading-[1.04] tracking-[-0.03em] sm:text-[56px] text-balance">
            We don&rsquo;t just make websites look good.
          </h2>
          <p className="mt-6 max-w-[500px] text-[17px] leading-[1.55] text-[#b4b4bc] sm:text-[19px]">
            We design and develop digital experiences around your business goals.
          </p>
          <div className="mt-8">
            <Button href={START} variant="brand" size="lg">
              Start a Project <span aria-hidden>→</span>
            </Button>
          </div>
        </div>

        <ul>
          {reasons.map((r, i) => (
            <li key={r.title} className="border-t border-white/[0.12]">
              <Reveal className="flex gap-6 py-7">
                <span className="pt-1.5 font-display text-base font-bold text-brand">{pad(i)}</span>
                <div>
                  <h3 className="font-display text-2xl font-medium tracking-[-0.01em]">{r.title}</h3>
                  <p className="mt-2 text-base leading-[1.5] text-[#a0a0a8]">{r.desc}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** Native <details>, so it opens without JavaScript and is keyboard-accessible. */
export function FAQ() {
  return (
    <section id="faq" className="bg-surface py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
        <div className="lg:sticky lg:top-40 lg:self-start">
          <Heading
            align="left"
            eyebrow="FAQ"
            title="Questions, answered."
            sub="Can’t find what you’re looking for? Ask us directly — we reply within 1–2 working days."
          />
          <Button
            href={START}
            variant="outline"
            size="md"
            className="mt-8 !border-fg/20 hover:!border-fg hover:!text-fg"
          >
            Ask a question
          </Button>
        </div>

        <div className="divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface">
          {faqs.map((f, i) => (
            <details key={f.q} className="group" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 font-display text-lg font-medium text-fg transition-colors hover:text-brand sm:px-7 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-lg leading-none text-muted transition-transform duration-300 group-open:rotate-45 group-open:border-brand group-open:text-brand"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="px-6 pb-6 text-[15px] leading-[1.6] text-muted sm:px-7">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
