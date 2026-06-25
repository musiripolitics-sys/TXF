import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { events, getEvent, eventAgenda } from "@/lib/data";

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.blurb,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  const isFree = event.price === "Free";
  const agenda = eventAgenda(event);
  const filled = event.capacity - event.spotsLeft;
  const pct = Math.round((filled / event.capacity) * 100);

  return (
    <>
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-line bg-ink-2">
        {event.image ? (
          <>
            <img
              src={event.image}
              alt={event.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
          </>
        ) : (
          <div className="pointer-events-none absolute inset-0 glow-brand" aria-hidden />
        )}
        <div className={`relative mx-auto max-w-5xl px-5 py-12 sm:px-8 ${event.image ? "text-white" : "text-fg"}`}>
          <Link
            href="/events"
            className={`text-sm transition-colors ${event.image ? "text-white/70 hover:text-white" : "text-muted hover:text-fg"}`}
          >
            ← All events
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${event.image ? "bg-white/15 text-white" : "bg-brand/10 text-brand-soft"}`}>
              {event.category}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isFree
                  ? (event.image ? "bg-white/25 text-white" : "bg-host/10 text-host-soft")
                  : (event.image ? "border border-white/20 text-white" : "border border-line text-fg")
              }`}
            >
              {event.priceLabel}
            </span>
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl text-balance">
            {event.title}
          </h1>
          <p className={`mt-4 max-w-2xl text-lg text-balance ${event.image ? "text-white/80" : "text-muted"}`}>
            {event.blurb}
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Main column */}
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-xl font-semibold text-fg">
              About this event
            </h2>
            <p className="mt-3 leading-relaxed text-muted">{event.about}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-fg">Agenda</h2>
            <ol className="mt-4 space-y-3">
              {agenda.map((item) => (
                <li
                  key={item.when}
                  className="flex gap-4 rounded-xl border border-line bg-surface px-4 py-3"
                >
                  <span className="w-28 shrink-0 text-sm font-medium text-brand-soft">
                    {item.when}
                  </span>
                  <span className="text-sm text-muted">{item.what}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-fg">Speakers</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {event.speakers.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-join text-sm font-bold text-white">
                    {s.initials}
                  </span>
                  <div>
                    <p className="font-medium text-fg">{s.name}</p>
                    <p className="text-xs text-faint">{s.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sticky registration card */}
        <aside className="lg:pt-2">
          <div className="sticky top-24 rounded-2xl border border-line bg-surface p-6 shadow-soft">
            <dl className="space-y-4 text-sm">
              <Detail label="When" value={`${event.dateLabel} · ${event.time}`} />
              <Detail label="Where" value={event.venue} sub={event.address} />
              <Detail label="Price" value={isFree ? "Free entry" : event.priceLabel} />
            </dl>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">{event.spotsLeft} spots left</span>
                <span className="text-faint">
                  {filled}/{event.capacity}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-2">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <Button
              href={`/events/${event.slug}#register`}
              variant="brand"
              size="lg"
              className="mt-6 w-full"
            >
              {isFree ? "Register free" : `Buy ticket · ${event.priceLabel}`}
            </Button>
            <p className="mt-3 text-center text-xs text-faint">
              Members get priority registration & discounts.{" "}
              <Link href="/membership" className="text-brand-soft underline">
                Join
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function Detail({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-faint">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-fg">{value}</dd>
      {sub && <dd className="text-xs text-muted">{sub}</dd>}
    </div>
  );
}
