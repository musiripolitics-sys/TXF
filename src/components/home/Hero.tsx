import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { categoryTheme } from "@/lib/data";
import { HeroSearch } from "./HeroSearch";

/**
 * "The Intersection."
 *
 * The mark is an X and the promise is "we connect", so the hero is built on a
 * crossing: the formats cascade down one diagonal while hairlines run the
 * other way behind them, meeting where the images do. Dark ground, because
 * the orange only goes electric against it and the photography stops reading
 * as stock on white.
 */

const FORMATS = [
  { category: "Meetup", image: "/events/meetup.jpg" },
  { category: "Hackathon", image: "/events/hackathon.jpg" },
  { category: "Workshop", image: "/events/workshop.jpg" },
  { category: "Conference", image: "/events/conference.jpg" },
] as const;

export function Hero() {
  return (
    <section className="edge-b relative -mt-[calc(4rem+1px)] overflow-hidden bg-[#0e0e0c] pt-[calc(4rem+1px)] text-white">
      <div
        className="pointer-events-none absolute right-[8%] top-[18%] h-80 w-80 rounded-full bg-brand/25 blur-[130px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
          backgroundSize: "72px 72px",
        }}
        aria-hidden
      />

      <div className="edge-pad-b relative mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-8">
          <div className="max-w-2xl">
            <span className="animate-float-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              5,000+ builders · 20+ cities · We Connect
            </span>

            <h1 className="animate-float-up mt-6 font-display text-[clamp(2.75rem,8.5vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.04em]">
              India&rsquo;s tech
              <br />
              community,
              <br />
              <span className="text-brand">in person</span>
            </h1>

            <p className="animate-float-up mt-6 max-w-md text-lg leading-relaxed text-white/65">
              Meetups, workshops, hackathons and conferences across India —
              plus the community that keeps going between them.
            </p>

            <div className="animate-float-up [&_input]:border-white/15 [&_input]:bg-white/5 [&_input]:text-white">
              <HeroSearch />
            </div>

            <div className="animate-float-up mt-5 flex flex-col gap-3 sm:flex-row">
              <Button href="/events" variant="brand" size="lg">
                Browse events
              </Button>
              <Link
                href="/host"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-base font-semibold text-white transition-colors hover:border-white/60"
              >
                Host an event
              </Link>
            </div>
          </div>

          {/* The formats, cascading down the diagonal. */}
          <div className="animate-float-up relative pb-6 lg:pb-0">
            <ul className="relative flex flex-col gap-3">
              {FORMATS.map(({ category, image }, i) => {
                const theme = categoryTheme[category as keyof typeof categoryTheme];
                return (
                  <li
                    key={category}
                    className="lg:[--step:2.25rem]"
                    style={{ marginLeft: `calc(var(--step, 0px) * ${i})` }}
                  >
                    <Link
                      href={`/events?category=${encodeURIComponent(category)}`}
                      className="group relative flex h-24 items-end overflow-hidden rounded-xl border border-white/10 sm:h-28"
                    >
                      <Image
                        src={image}
                        alt=""
                        fill
                        priority={i === 0}
                        sizes="(max-width: 1024px) 100vw, 34vw"
                        className="object-cover opacity-95 transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0c] via-[#0e0e0c]/30 to-transparent" />
                      <div className="relative flex w-full items-center gap-2 p-4">
                        <Icon name={theme.icon} className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.9} />
                        <span className="font-display text-base font-bold tracking-tight text-white">
                          {category}
                        </span>
                        <span className="ml-auto text-white/40 transition-transform duration-300 group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 text-sm text-white/45">
              The formats we run, year-round.{" "}
              <Link href="/events" className="text-brand hover:underline">
                See what&rsquo;s on →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
