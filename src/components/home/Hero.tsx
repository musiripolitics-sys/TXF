import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { categoryTheme } from "@/lib/data";
import { HeroSearch } from "./HeroSearch";

/**
 * The hero has to answer "what is this?" before anyone reads a word.
 *
 * The old one was text on a grid: a headline, a paragraph, two buttons. It
 * said "community for technology enthusiasts" and showed nothing, so it read
 * as a template. This puts the work itself beside the copy — the formats TXF
 * actually runs, as images, each linking into that filtered listing.
 */

const SHOWCASE = [
  // The tall tile is the hero's largest image and its LCP candidate, so it
  // loads eagerly; the rest can wait.
  { category: "Meetup", image: "/events/meetup.jpg", span: "row-span-2" },
  { category: "Hackathon", image: "/events/hackathon.jpg", span: "" },
  { category: "Workshop", image: "/events/workshop.jpg", span: "" },
  { category: "Conference", image: "/events/conference.jpg", span: "" },
  { category: "Networking", image: "/events/networking.jpg", span: "" },
] as const;

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden border-b border-line">
      <div className="absolute inset-0 bg-grid" aria-hidden />
      <div className="absolute inset-0 glow-brand" aria-hidden />
      <div
        className="pointer-events-none absolute -top-32 right-0 h-72 w-[38rem] rounded-full bg-brand/20 blur-[120px]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid items-center gap-8 lg:gap-12 lg:grid-cols-[1.05fr_1fr]">
          {/* ── Copy ── */}
          <div className="max-w-xl">
            <span className="animate-float-up inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-host" />
              5,000+ builders · 20+ cities · We Connect
            </span>

            <h1 className="animate-float-up mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-fg sm:text-5xl lg:text-6xl text-balance">
              India&rsquo;s tech community,{" "}
              <span className="text-brand">in person</span>
            </h1>

            <p className="animate-float-up mt-4 text-lg text-muted text-balance">
              Meetups, workshops, hackathons and conferences across India —
              plus the community that keeps going between them.
            </p>

            <div className="animate-float-up">
              <HeroSearch />
            </div>

            <div className="animate-float-up mt-5 flex flex-col gap-3 sm:flex-row">
              <Button href="/events" variant="join" size="lg">
                Browse events
              </Button>
              <Button href="/host" variant="host" size="lg">
                Host an event
              </Button>
            </div>
          </div>

          {/* ── What we actually run ── */}
          <div className="animate-float-up relative">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              {SHOWCASE.map(({ category, image, span }) => {
                const theme = categoryTheme[category as keyof typeof categoryTheme];
                return (
                  <Link
                    key={category}
                    href={`/events?category=${encodeURIComponent(category)}`}
                    className={`group relative overflow-hidden rounded-2xl border border-line ${span} ${
                      span ? "min-h-[13rem]" : "min-h-[6.25rem]"
                    }`}
                  >
                    <Image
                      src={image}
                      alt=""
                      fill
                      priority={!!span}
                      sizes="(max-width: 1024px) 33vw, 22vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-3">
                      <Icon
                        name={theme.icon}
                        className="h-3.5 w-3.5 shrink-0 text-white/90"
                        strokeWidth={1.8}
                      />
                      <span className="truncate font-display text-sm font-semibold text-white">
                        {category}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <p className="mt-3 text-center text-xs text-faint lg:text-left">
              The formats we run, year-round across India.{" "}
              <Link href="/events" className="text-brand-soft hover:underline">
                See what&rsquo;s on →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
