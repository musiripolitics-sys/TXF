import Image from "next/image";
import { Section, SectionHeading } from "@/components/Section";
import { impactSteps } from "@/lib/data";
import { getActivities } from "@/lib/content";
import { Icon } from "@/components/Icon";

/**
 * Each service gets a photograph, because this section has to answer "what
 * does this company do" at a glance — nobody reads six paragraphs to find out.
 *
 * Activities are editable rows with no image column, so the artwork is matched
 * on the title here. An unmatched title still renders: it just falls back to
 * the brand gradient rather than breaking the grid.
 */
const ART: Record<string, { image: string; icon: string }> = {
  "monthly meetups": { image: "/events/meetup.jpg", icon: "coffee" },
  meetups: { image: "/events/meetup.jpg", icon: "coffee" },
  hackathons: { image: "/events/hackathon.jpg", icon: "code" },
  workshops: { image: "/events/workshop.jpg", icon: "wrench" },
  "startup showcases": { image: "/events/launch.jpg", icon: "rocket" },
  mentorship: { image: "/events/networking.jpg", icon: "users" },
  "innovation challenges": { image: "/events/conference.jpg", icon: "trophy" },
  webinars: { image: "/events/webinar.jpg", icon: "broadcast" },
  conferences: { image: "/events/conference.jpg", icon: "mic" },
  networking: { image: "/events/networking.jpg", icon: "nodes" },
};

const artFor = (title: string) => ART[title.trim().toLowerCase()] ?? null;

export async function Activities() {
  const activities = await getActivities();
  return (
    <div className="relative overflow-hidden border-y border-line">
      <Section id="activities" className="relative z-10">
      <SectionHeading
        eyebrow="Our Activities"
        title="What we do"
        description="Six things we run, year-round, across India."
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((a) => {
          const art = artFor(a.title);
          return (
            <article
              key={a.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.25)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                {art ? (
                  <Image
                    src={art.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand to-join" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
                    <Icon
                      name={art?.icon ?? "sparkle"}
                      className="h-4 w-4"
                      strokeWidth={1.8}
                    />
                  </span>
                  <h3 className="font-display text-lg font-bold text-white">
                    {a.title}
                  </h3>
                </div>
              </div>

              <p className="flex-1 px-5 py-4 text-sm leading-relaxed text-muted">
                {a.desc}
              </p>
            </article>
          );
        })}
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
