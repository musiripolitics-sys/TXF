import { Button } from "@/components/Button";
import { Container } from "./ui";
import { heroChips, highlights, START } from "./data";

/** Figma: Hero — white canvas, soft orange glow, centered display type. */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface" aria-labelledby="ts-hero-title">
      <div
        className="pointer-events-none absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-brand/[0.16] blur-[140px]"
        aria-hidden
      />

      <Container className="relative flex flex-col items-center pb-16 pt-16 text-center sm:pb-24 sm:pt-[120px]">
        <p className="animate-float-up inline-flex items-center gap-2 rounded-full bg-[#ffede4] px-4 py-2 text-sm font-semibold text-[#c2410c]">
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
          We Design. We Develop. We Deliver.
        </p>

        <h1
          id="ts-hero-title"
          className="animate-float-up mt-8 max-w-[1160px] font-display text-[36px] font-bold leading-[1.05] tracking-[-0.035em] text-fg min-[400px]:text-[40px] sm:text-[68px] lg:text-[92px] lg:leading-[0.98] text-balance"
        >
          We Design Digital Experiences That <span className="text-brand">Move Businesses Forward.</span>
        </h1>

        <p className="animate-float-up mt-8 max-w-[680px] text-lg leading-[1.5] text-muted sm:text-[21px]">
          From creative design to powerful development, TXF builds websites that look great, work
          seamlessly, and support business growth.
        </p>

        <div className="animate-float-up mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Button href={START} variant="brand" size="lg" className="w-full sm:w-auto">
            Start a Project <span aria-hidden>→</span>
          </Button>
          <Button
            href="#work"
            variant="outline"
            size="lg"
            className="w-full !border-fg/20 hover:!border-fg hover:!text-fg sm:w-auto"
          >
            View Our Work
          </Button>
        </div>

        <ul className="animate-float-up mt-8 flex max-w-[640px] flex-wrap justify-center gap-2" aria-label="What we do">
          {heroChips.map((c) => (
            <li key={c} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-muted sm:px-4 sm:py-2 sm:text-sm">
              {c}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** Figma: Highlights — the four-figure strip under the hero. */
export function Highlights() {
  return (
    <section className="bg-surface pb-20 sm:pb-28" aria-label="TXF at a glance">
      <Container>
        <dl className="grid grid-cols-2 gap-y-7 rounded-3xl border border-line bg-ink px-3 py-8 sm:px-6 sm:py-9 lg:grid-cols-4">
          {highlights.map((h) => (
            <div key={h.label} className="flex flex-col items-center px-2 text-center">
              <dt className="order-last mt-1.5 text-[13px] leading-snug text-muted sm:text-[15px]">{h.label}</dt>
              <dd className="font-display text-[32px] font-bold leading-none tracking-[-0.02em] text-fg sm:text-[40px]">
                {h.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
