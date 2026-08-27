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

/**
 * The back of each card.
 *
 * The activities table holds a single line each, which left the flipped face
 * mostly empty. These three points per service fill it and answer the
 * questions someone actually has: what happens, who it's for, what they walk
 * away with.
 *
 * DRAFT COPY — written to describe each format, not from operational detail
 * only TXF knows. Worth a read-through and edit. If it should be editable
 * without a deploy it belongs in the activities table instead; ask and I'll
 * move it.
 */
const DETAIL: Record<string, string[]> = {
  "monthly meetups": [
    "Short talks from people building locally, then an open floor",
    "Open to anyone in tech — no experience bar",
    "You leave knowing people in your own city",
  ],
  meetups: [
    "Short talks from people building locally, then an open floor",
    "Open to anyone in tech — no experience bar",
    "You leave knowing people in your own city",
  ],
  hackathons: [
    "Form a team on the day or bring your own",
    "A weekend to take an idea from nothing to working",
    "Demo to the room, with prizes for what ships",
  ],
  workshops: [
    "Laptops open — you build alongside the instructor",
    "Kept small enough that questions get answered",
    "You leave with something you made yourself",
  ],
  "startup showcases": [
    "Early teams pitch to a room of founders and operators",
    "Straight feedback from people who have shipped before",
    "Exposure well past your own network",
  ],
  mentorship: [
    "Paired with someone senior in your field",
    "Career direction, product calls, or technical depth",
    "Built around what you're working on right now",
  ],
  "innovation challenges": [
    "Open briefs and bounties posted for the community",
    "Enter solo or as a team, and work at your own pace",
    "Recognition and a public record of what you built",
  ],
};

const detailFor = (title: string) => DETAIL[title.trim().toLowerCase()] ?? null;

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

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((a) => {
          const art = artFor(a.title);
          const detail = detailFor(a.title);
          return (
            <article
              key={a.title}
              // tabIndex so the back is reachable by keyboard, not just mouse.
              tabIndex={0}
              className="flip rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <div className="flip-inner rounded-2xl shadow-soft">
                {/* Front: the photograph and the name. */}
                <div className="flip-face flip-front border border-line bg-surface">
                  <div className="relative aspect-[16/9] w-full">
                    {art ? (
                      <Image
                        src={art.image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
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
                </div>

                {/* Back: what it actually is. Keeps a dimmed frame of the same
                    photo so the card still reads as the same thing. */}
                <div className="flip-face flip-back border border-brand/30 bg-surface">
                  <div className="relative h-full w-full">
                    {art && (
                      <Image
                        src={art.image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover opacity-[0.07]"
                      />
                    )}
                    <div className="relative flex h-full flex-col justify-center p-4">
                      <span className="flex items-center gap-2">
                        <Icon
                          name={art?.icon ?? "sparkle"}
                          className="h-4 w-4 shrink-0 text-brand-soft"
                          strokeWidth={1.8}
                        />
                        <h3 className="font-display text-base font-bold text-fg">
                          {a.title}
                        </h3>
                      </span>

                      <p className="mt-1.5 text-sm font-medium leading-snug text-fg">{a.desc}</p>

                      {detail ? (
                        <ul className="mt-2.5 flex flex-col gap-1.5 border-t border-line pt-2.5">
                          {detail.map((point) => (
                            <li key={point} className="flex gap-2 text-[13px] leading-snug text-muted">
                              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden />
                              {point}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Touch devices get no hover, so the detail sits under the
                  photo instead of being locked behind a gesture. */}
              <p className="mt-3 text-sm leading-relaxed text-muted [@media(hover:hover)]:hidden">
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
