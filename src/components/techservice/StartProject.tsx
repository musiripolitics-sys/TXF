import { Container, Heading } from "./ui";
import { ProjectEnquiryForm } from "./ProjectEnquiryForm";

const EMAIL = "hello@techxfluence.com";
const MAILTO = `mailto:${EMAIL}?subject=Project%20enquiry%20%E2%80%94%20TXF%20Tech%20Services`;

const NEXT_STEPS = [
  { title: "We reply", desc: "Within 1–2 working days, from a real person on the team." },
  { title: "Discovery call", desc: "A short call to understand your goals, users and constraints." },
  { title: "Proposal", desc: "Scope, timeline and cost — clear enough to decide on." },
] as const;

/** Figma: Final CTA — the centered orange banner. */
export function FinalCTA() {
  return (
    <section className="bg-surface px-0 pt-20 sm:pt-28" aria-labelledby="ts-cta-title">
      <Container>
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-brand to-[#ff8a3d] px-6 py-16 text-center text-white sm:rounded-[36px] sm:px-16 sm:py-[88px]">
          <span
            className="pointer-events-none absolute -top-[180px] right-[-100px] h-[520px] w-[520px] rounded-full border border-white/25"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -bottom-[200px] -left-[120px] h-[360px] w-[360px] rounded-full border border-white/20"
            aria-hidden
          />
          <div className="relative flex flex-col items-center">
            <h2
              id="ts-cta-title"
              className="max-w-[960px] font-display text-[40px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[56px] lg:text-[72px] text-balance"
            >
              Have an idea? Let&rsquo;s build it.
            </h2>
            <p className="mt-6 max-w-[600px] text-[17px] leading-[1.5] text-white/90 sm:text-[19px]">
              Tell us what you&rsquo;re planning — we&rsquo;ll come back with a clear plan, timeline and estimate.
            </p>
            <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <a
                href="#start-project"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-fg px-7 py-3.5 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-black sm:w-auto"
              >
                Talk to TXF <span aria-hidden>→</span>
              </a>
              <a
                href={MAILTO}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/50 px-7 py-3.5 text-base font-medium text-white transition-colors hover:border-white hover:bg-white/10 sm:w-auto"
              >
                {EMAIL}
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** The enquiry form, directly under the banner. */
export function StartProject() {
  return (
    <section id="start-project" className="bg-surface py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-40 lg:self-start">
          <Heading
            align="left"
            eyebrow="Start a project"
            title="Tell us what you’re building."
            sub="A few details are enough to start. We’ll take it from there."
          />

          <ol className="mt-10 space-y-5">
            {NEXT_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 font-display text-sm font-bold text-brand">
                  {i + 1}
                </span>
                <div>
                  <p className="font-display text-lg font-medium text-fg">{s.title}</p>
                  <p className="text-[15px] leading-[1.5] text-muted">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-10 text-[15px] text-muted">
            Prefer email?{" "}
            <a href={MAILTO} className="font-medium text-fg underline decoration-brand underline-offset-4 hover:text-brand">
              {EMAIL}
            </a>
          </p>
        </div>

        <ProjectEnquiryForm />
      </Container>
    </section>
  );
}
