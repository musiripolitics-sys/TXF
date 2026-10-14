import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { getEventBySlug } from "@/lib/events";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "@/components/RegistrationForm";
import { EventActions } from "@/components/EventActions";
import { EventJsonLd } from "@/components/EventJsonLd";
import { EventFacts } from "@/components/EventFacts";
import { EventWhereBlock } from "@/components/EventWhereBlock";
import { EventProse } from "@/components/EventProse";
import { EventOrganizer } from "@/components/EventOrganizer";
import { RelatedEvents } from "@/components/RelatedEvents";
import { getEvents, getAttendance } from "@/lib/events";
import { GoingStrip } from "@/components/GoingStrip";
import {
  getActiveTier,
  applyMemberDiscount,
  discountPct,
  type PaidTier,
} from "@/lib/membership";
import { DownloadTicketBtn } from "@/components/DownloadTicketBtn";
import { CancelRegistrationBtn } from "@/components/CancelRegistrationBtn";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };

  const url = `/events/${event.slug}`;
  const image = event.image ?? "/logo.png";
  return {
    title: event.title,
    description: event.blurb,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: event.title,
      description: event.blurb,
      images: [{ url: image, alt: event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.blurb,
      images: [image],
    },
  };
}

/** The chapter an event belongs to, for the post-registration prompt. */
async function loadChapter(communityId?: string) {
  if (!communityId) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("communities")
      .select("slug, name")
      .eq("id", communityId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

/** Events hosted and follower count for the organiser card. */
async function loadOrganizer(hostId?: string) {
  if (!hostId) return null;
  try {
    const supabase = await createClient();
    const [{ count: hosted }, { count: followers }] = await Promise.all([
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("host_id", hostId)
        .eq("status", "published"),
      supabase
        .from("organizer_follows")
        .select("organizer_id", { count: "exact", head: true })
        .eq("organizer_id", hostId),
    ]);
    return { hosted: hosted ?? 0, followers: followers ?? 0 };
  } catch {
    return null;
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    notFound();
  }

  const isFree = event.price === "Free";
  const agenda = event.agenda ?? [];
  const filled = event.capacity - event.spotsLeft;
  const pct = Math.round((filled / event.capacity) * 100);

  // Siblings for the "you might also like" rail, and the organiser's stats.
  const [allEvents, organizer, attendanceMap] = await Promise.all([
    getEvents(),
    loadOrganizer(event.hostId),
    event.id
      ? getAttendance([event.id])
      : Promise.resolve({} as Awaited<ReturnType<typeof getAttendance>>),
  ]);
  const attendance = event.id ? attendanceMap[event.id] : undefined;

  // Somewhere to go once they've registered: the same ranking the bottom rail
  // uses, trimmed to what fits beside a ticket code.
  const nextUp = allEvents
    .filter((e) => e.slug !== event.slug)
    .sort(
      (a, b) =>
        (b.category === event.category ? 2 : 0) + (b.city === event.city ? 1 : 0) -
        ((a.category === event.category ? 2 : 0) + (a.city === event.city ? 1 : 0)) ||
        a.date.localeCompare(b.date),
    )
    .slice(0, 2)
    .map((e) => ({
      slug: e.slug,
      title: e.title,
      dateLabel: e.dateLabel,
      city: e.city,
      image: e.image,
      priceLabel: e.price === "Free" ? "Free" : e.priceLabel,
    }));

  const chapter = await loadChapter(event.communityId);

  const user = await getCurrentUser();
  let userProfile = null;
  let userRegistrations: {
    id: string;
    ticket_code: string;
    attendee_name: string;
    status: string;
    payment_id: string | null;
  }[] = [];
  let memberTier: PaidTier | null = null;
  let memberPriceLabel: string | null = null;
  if (user) {
    const supabase = await createClient();
    // One parallel batch instead of four sequential round trips.
    const [{ data: profile }, { data: regs }, tier, { data: priceRow }] =
      await Promise.all([
        supabase
          .from("users")
          .select("full_name, email, phone")
          .eq("id", user.id)
          .single(),
        event.id
          ? supabase
              .from("registrations")
              .select("id, ticket_code, attendee_name, status, payment_id")
              .eq("user_id", user.id)
              .eq("event_id", event.id)
          : Promise.resolve({ data: null }),
        getActiveTier(supabase, user.id),
        !isFree && event.id
          ? supabase
              .from("events")
              .select("price_amount")
              .eq("id", event.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    if (profile) userProfile = profile;
    if (regs) userRegistrations = regs;
    memberTier = tier;

    // Member ticket discount preview (the charge is enforced server-side).
    if (memberTier && priceRow?.price_amount) {
      const discounted = applyMemberDiscount(priceRow.price_amount, memberTier);
      memberPriceLabel = `₹${(discounted / 100).toLocaleString("en-IN")}`;
    }
  }

  return (
    <>
      <EventJsonLd event={event} startsAt={event.startsAt} endsAt={event.endsAt} />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-line bg-ink-2">
        {event.image ? (
          <>
            <Image src={event.image} alt={event.title} fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
          </>
        ) : (
          <div className="pointer-events-none absolute inset-0 glow-brand" aria-hidden />
        )}
        <div className={`relative mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-14 ${event.image ? "text-white" : "text-fg"}`}>
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
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl text-balance">
            {event.title}
          </h1>
          {/* Clamped on a phone. Unclamped, a long blurb pushed the date, the
              price and the register button entirely below the fold — the hero
              filled all 812px of an iPhone screen and said nothing actionable. */}
          <p className={`mt-3 line-clamp-3 max-w-2xl text-base text-pretty sm:mt-4 sm:line-clamp-none sm:text-lg ${event.image ? "text-white/80" : "text-muted"}`}>
            {event.blurb}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8">
        <EventFacts
          dateLabel={event.dateLabel}
          time={event.time}
          venue={event.venue}
          city={event.city}
          spotsLeft={event.spotsLeft}
          capacity={event.capacity}
        />
      </div>

      {attendance && attendance.going > 0 && (
        <div className="mx-auto max-w-6xl px-5 pt-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <GoingStrip going={attendance.going} names={attendance.names} size="md" />
            {attendance.names.length === 0 && (
              // Names are a Pro perk now, so the prompt depends on who's asking.
              <span className="text-xs text-faint">
                {!user ? (
                  <>
                    <Link href="/login" className="text-brand-soft hover:underline">
                      Sign in
                    </Link>{" "}
                    to see who else is coming.
                  </>
                ) : !memberTier ? (
                  <>
                    <Link href="/membership" className="text-brand-soft hover:underline">
                      Go Pro
                    </Link>{" "}
                    to see who else is coming.
                  </>
                ) : null}
              </span>
            )}
          </div>
        </div>
      )}

      {/*
        * max-w-6xl, not 5xl, and a rail with a fixed width rather than a
        * fraction. At 1440 the old grid gave the prose column 566px inside a
        * 1024px container, leaving 160px of gutter unused on each side while
        * the booking card was squeezed to 354px. A measure of ~700px reads
        * better and the rail stops shrinking on narrower laptops.
        */}
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 pb-28 sm:px-8 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,380px)] lg:gap-12 lg:py-10 lg:pb-14">
        {/* Main column */}
        <div className="space-y-10">
          <section>
            <SectionTitle>About this event</SectionTitle>
            <EventProse text={event.about} />
          </section>

          {agenda.length > 0 && (
          <section>
            <SectionTitle>
              {/* "Agenda" for a single sitting, "Schedule" once there is more
                  than a day's worth. Read off the rows, not off this event. */}
              {agenda.length > 3 ? "Schedule" : "Agenda"}
            </SectionTitle>
            {/*
              * A timeline rather than a two-column table.
              *
              * The old shape gave the label a fixed 7rem column and ran the
              * detail beside it, which works for "Doors open — registration"
              * and collapses the moment a row carries a real description: four
              * weeks of curriculum arrived as four dense paragraphs wearing
              * narrow labels. Stacking the label above its detail gives the
              * text the full column and turns the rail into something you can
              * run your eye down.
              */}
            <ol className="mt-4 space-y-0">
              {agenda.map((item, i) => (
                <li key={item.when} className="relative flex gap-4 pb-5 last:pb-0">
                  <div className="flex shrink-0 flex-col items-center">
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-brand/30 bg-brand/10 text-[11px] font-semibold tabular-nums text-brand-soft">
                      {i + 1}
                    </span>
                    {i < agenda.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-line" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="font-display text-sm font-semibold text-fg">
                      {item.when}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{item.what}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          )}

          {event.speakers.length > 0 && (
          <section>
            <SectionTitle>Speakers</SectionTitle>
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
          )}

          <EventWhereBlock
            venue={event.venue}
            address={event.address}
            city={event.city}
            latitude={event.latitude}
            longitude={event.longitude}
          />

          {event.highlights && event.highlights.length > 0 && (
            <section>
              <SectionTitle>Good to know</SectionTitle>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {event.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted"
                  >
                    <span className="mt-0.5 shrink-0 text-brand-soft" aria-hidden>✓</span>
                    {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <EventOrganizer
            hostId={event.hostId}
            hostName={event.hostName}
            eventsHosted={organizer?.hosted}
            followers={organizer?.followers}
          />

          {!isFree && event.refundPolicy && (
            <section>
              <SectionTitle>Refunds &amp; cancellation</SectionTitle>
              <p className="mt-3 whitespace-pre-wrap rounded-xl border border-line bg-surface px-4 py-4 text-sm leading-relaxed text-muted">
                {event.refundPolicy}
              </p>
            </section>
          )}

          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-faint">
                Topics
              </span>
              {event.tags.map((t) => (
                <Link
                  key={t}
                  href={`/events?tag=${encodeURIComponent(t)}`}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted transition-colors hover:border-brand hover:text-brand"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}


        </div>

        {/*
          * The booking rail.
          *
          * It used to be one sticky card holding price, host, add-to-calendar,
          * share, the seats bar, your tickets, the whole registration form and
          * a membership note — 972px of it, pinned at top:96px in a 900px
          * window. From a third of the way down the page to near the end, the
          * bottom 168px of that card sat below the fold and no amount of
          * scrolling brought it back, because a stuck element does not move.
          * Measured at 1440x900, what lived down there was:
          *
          *   "Members save up to 50% on every ticket. See plans"
          *   "By registering, you agree to our Code of Conduct and Terms"
          *   "Members get priority registration & discounts. Join"
          *
          * so a consent notice that could not be read and two upsells that
          * could not be clicked. The buy button itself cleared the fold by
          * seven pixels, which is luck rather than design: one more question
          * on the form, one more ticket tier, or an existing ticket shown
          * above it, and it goes under too.
          *
          * So the sticky part now holds only the decision — price, seats,
          * register — and is capped at the viewport with its own scrollbar, so
          * a long form (many questions, several tiers, an existing ticket)
          * stays reachable instead of being clipped. Everything that is
          * reference rather than decision moved below it and scrolls normally.
          *
          * Deliberately NOT overscroll-contain. The card is usually only a few
          * dozen pixels taller than its cap, and containing the overscroll
          * would mean a wheel gesture over it stopped dead at the end of those
          * pixels instead of carrying on down the page — swapping one scroll
          * trap for a subtler one.
          */}
        <aside className="space-y-4 lg:pt-2">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6 lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-faint">
                  Price
                </p>
                <p className="mt-0.5 font-display text-2xl font-bold text-fg">
                  {isFree ? "Free" : event.priceLabel}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {event.spotsLeft} of {event.capacity} left
              </span>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-2">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-5">
              {userRegistrations.length > 0 && (
                <div className="mb-6 space-y-3">
                  <h3 className="font-semibold text-fg mb-3 text-center text-sm">Your Tickets</h3>
                  {userRegistrations.map((reg) => {
                    const isWaitlisted = reg.status === "waitlisted";
                    return (
                      <div
                        key={reg.id}
                        className={`flex flex-col items-center justify-center rounded-xl bg-ink-2 p-4 border ${isWaitlisted ? "border-amber-500/30" : "border-brand/20"}`}
                      >
                        {isWaitlisted ? (
                          <>
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                              Waitlisted
                            </span>
                            <span className="mt-2 text-xs text-muted">
                              {reg.attendee_name} — we&apos;ll email you if a spot opens.
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-medium text-brand-soft mb-1">TICKET CODE</span>
                            <span className="font-mono text-2xl font-bold text-fg tracking-wider">{reg.ticket_code.toUpperCase()}</span>
                            <span className="text-xs text-muted mt-2 mb-4">{reg.attendee_name}</span>
                            <DownloadTicketBtn event={event} ticketCode={reg.ticket_code} attendeeName={reg.attendee_name} />
                          </>
                        )}
                        <div className="mt-3">
                          {reg.payment_id ? (
                            // Paid ticket: self-cancel would silently forfeit the
                            // payment — route through support for a refund instead.
                            <a
                              href="/contact"
                              className="text-xs text-faint underline hover:text-muted"
                            >
                              Need to cancel? Contact support for a refund
                            </a>
                          ) : (
                            <CancelRegistrationBtn registrationId={reg.id} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <RegistrationForm
                eventId={event.id || ""}
                isFull={event.spotsLeft <= 0}
                isPaid={event.price === "Paid"}
                priceLabel={memberPriceLabel ?? event.priceLabel}
                ticketTypes={event.ticketTypes}
                questions={event.questions}
                memberNote={
                  memberTier
                    ? `${discountPct(memberTier)}% ${memberTier} member discount applied`
                    : undefined
                }
                userProfile={userProfile}
                nextSteps={{
                  calendar: {
                    title: event.title,
                    dateISO: event.date,
                    time: event.time,
                    location: [event.venue, event.address, event.city]
                      .filter(Boolean)
                      .join(", "),
                    details: event.blurb,
                  },
                  related: nextUp,
                  chapter,
                }}
              />
            </div>
          </div>

          {/* Reference, not decision: nothing here is worth costing the
              register button its place on screen. */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
            {event.hostName && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-faint">
                  Host
                </p>
                <p className="mt-0.5 text-fg">
                  {event.hostId ? (
                    <Link
                      href={`/organizer/${event.hostId}`}
                      className="font-medium text-brand-soft hover:underline"
                    >
                      {event.hostName} →
                    </Link>
                  ) : (
                    event.hostName
                  )}
                </p>
              </div>
            )}
            <EventActions
              title={event.title}
              dateISO={event.date}
              time={event.time}
              location={`${event.venue}, ${event.address}`}
              details={event.blurb}
            />
            <p className="mt-4 text-center text-xs text-faint">
              Members get priority registration & discounts.{" "}
              <Link href="/membership" className="text-brand-soft underline">
                Join
              </Link>
            </p>
          </div>
        </aside>
      </div>

      <RelatedEvents current={event} all={allEvents} />

      {/* Mobile sticky register bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {event.spotsLeft <= 0 ? (
          <span className="block rounded-full bg-ink-2 py-3 text-center text-sm font-semibold text-muted">
            Sold out
          </span>
        ) : (
          <a
            href="#register"
            className="block rounded-full bg-brand py-3 text-center text-sm font-semibold text-white"
          >
            {isFree
              ? "Register free"
              : `Buy ticket · ${memberPriceLabel ?? event.priceLabel}`}
          </a>
        )}
      </div>
    </>
  );
}

/**
 * One section heading for the whole page.
 *
 * The same four classes were retyped on eight <h2>s, which is how they drift:
 * change the scale in one place and the page grows two sizes of the same
 * thing. It also lets the rule "a section heading is a section heading" be
 * stated once rather than implied eight times.
 */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
      {children}
    </h2>
  );
}

