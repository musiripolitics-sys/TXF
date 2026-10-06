import { Button } from "@/components/Button";
import { Container, Heading } from "./ui";
import { Reveal } from "./Reveal";
import { ProjectVisual } from "./ProjectVisual";
import { projects, START } from "./data";

/** Figma: Our Work — alternating project cards with a screen preview. */
export function Work() {
  return (
    <section id="work" className="border-y border-line bg-ink py-20 sm:py-28">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Heading
            align="left"
            eyebrow="Our work"
            title="What we build."
            sub="From a single landing page to the software that runs a whole business."
          />
          <Button
            href={START}
            variant="outline"
            size="md"
            className="self-start !border-fg/20 hover:!border-fg hover:!text-fg md:self-auto"
          >
            Discuss a project →
          </Button>
        </div>

        <div className="mt-14 space-y-6">
          {projects.map((p, i) => (
            <Reveal key={p.name}>
              <article className="group grid items-center gap-8 rounded-[32px] border border-line bg-surface p-4 sm:p-6 lg:grid-cols-[minmax(0,620fr)_minmax(0,500fr)] lg:gap-14">
                <div className={i % 2 ? "lg:order-2" : ""}>
                  <ProjectVisual kind={p.visual} />
                </div>
                <div className={`px-2 pb-4 lg:py-4 ${i % 2 ? "lg:pl-8" : "lg:pr-8"}`}>
                  <p className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-faint">
                    <span className="font-display text-brand">{String(i + 1).padStart(2, "0")}</span>
                    {p.category}
                  </p>
                  <h3 className="mt-3 font-display text-[28px] font-bold leading-[1.08] tracking-[-0.02em] text-fg sm:text-[36px]">
                    {p.name}
                  </h3>
                  <dl className="mt-5 text-[15px]">
                    <Row label="Services">{p.services}</Row>
                    <Row label="Includes">{p.includes}</Row>
                    {p.result && (
                      <Row label="Result">
                        <span className="font-display text-lg font-medium leading-[1.4] text-brand">{p.result}</span>
                      </Row>
                    )}
                  </dl>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-4 border-t border-line py-3.5 sm:grid-cols-[120px_1fr]">
      <dt className="pt-0.5 text-[13px] font-medium uppercase tracking-[0.04em] text-faint">{label}</dt>
      <dd className="leading-[1.5] text-fg">{children}</dd>
    </div>
  );
}
