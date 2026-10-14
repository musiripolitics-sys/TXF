import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventBySlug } from "@/lib/events";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EventActions } from "@/components/EventActions";
import { EventJsonLd } from "@/components/EventJsonLd";
import { EventFacts } from "@/components/EventFacts";
import { EventWhereBlock } from "@/components/EventWhereBlock";
import { EventProse } from "@/components/EventProse";
import { EventSectionNav } from "@/components/EventSectionNav";
import { RegisterCta } from "@/components/RegisterCta";
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

  const sections = [
    event.about ? { id: "about", label: "About" } : null,
    agenda.length > 0
      ? { id: "schedule", label: agenda.length > 3 ? "Schedule" : "Agenda" }
      : null,
    event.speakers.length > 0 ? { id: "speakers", label: "Speakers" } : null,
    { id: "where", label: "Where" },
    event.highlights && event.highlights.length > 0
      ? { id: "good-to-know", label: "Good to know" }
      : null,
    event.hostName ? { id: "organiser", label: "Organiser" } : null,
    !isFree && event.refundPolicy ? { id: "refunds", label: "Refunds" } : null,
  ].filter((x): x is { id: string; label: string } => x !== null);

  const filled = event.capacity - event.spotsLeft;
  const pct = Math.max(0, Math.min(100, Math.round((filled / event.capacity) * 100)));

  // Siblings for the "you might also like" rail, and the organiser's stats.
  const [allEvents, organizer, attendanceMap] = await Promise.all([
    getEvents(),
    loadOrganizer(event.hostId),
    event.id
      ? getAttendance([event.id])
      : Promise.resolve({} as Awaited<ReturnType<typeof getAttendance>>),
  ]);
  const attendance = event.id ? attendanceMap[event.id] : undefined;

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

    if (memberTier && priceRow?.price_amount) {
      const discounted = applyMemberDiscount(priceRow.price_amount, memberTier);
      memberPriceLabel = `₹${(discounted / 100).toLocaleString("en-IN")}`;
    }
  }

  const hasTicket = userRegistrations.length > 0;

  return (
    <>
      <EventJsonLd event={event} startsAt={event.startsAt} endsAt={event.endsAt} />

      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-line bg-ink-2/30">
        <div className="pointer-events-none absolute inset-0 glow-brand opacity-60" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
          {/* Breadcrumb Navigation */}
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand transition-colors"
          >
            <span aria-hidden>←</span>
            <span>All events</span>
          </Link>

          <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12 lg:items-center">
            {/* Left: Event Details */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand-soft">
                  {event.category}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isFree
                      ? "bg-host/10 text-host-soft"
                      : "border border-line bg-surface text-fg"
                  }`}
                >
                  {isFree ? "Free Admission" : event.priceLabel}
                </span>
                {event.spotsLeft <= 0 ? (
                  <span className="rounded-full bg-ink-2 px-3 py-1 text-xs font-semibold text-muted">
                    Sold out
                  </span>
                ) : event.spotsLeft <= 25 ? (
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Only {event.spotsLeft} spots left
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl text-balance leading-[1.12]">
                {event.title}
              </h1>

              <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg max-w-2xl text-pretty">
                {event.blurb}
              </p>

              {/* Host and Attendee Social Proof Bar */}
              <div className="mt-6 flex flex-wrap items-center gap-4 pt-5 border-t border-line/60">
                {event.hostName && (
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand to-join text-xs font-bold text-white shadow-sm">
                      {event.hostName.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="text-xs">
                      <span className="text-faint">Hosted by </span>
                      {event.hostId ? (
                        <Link href={`/organizer/${event.hostId}`} className="font-semibold text-fg hover:text-brand transition-colors">
                          {event.hostName}
                        </Link>
                      ) : (
                        <span className="font-semibold text-fg">{event.hostName}</span>
                      )}
                    </div>
                  </div>
                )}

                {attendance && attendance.going > 0 && (
                  <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-line/60">
                    <GoingStrip going={attendance.going} names={attendance.names} size="sm" />
                    {attendance.names.length === 0 && (
                      <span className="text-xs text-faint">
                        {!user ? (
                          <Link href="/login" className="text-brand-soft hover:underline">
                            Sign in to view
                          </Link>
                        ) : !memberTier ? (
                          <Link href="/membership" className="text-brand-soft hover:underline">
                            Go Pro to view
                          </Link>
                        ) : null}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Featured Event Banner / Artwork Showcase */}
            <div className="w-full">
              {event.image ? (
                <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-soft group">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 500px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl pointer-events-none" />
                </div>
              ) : (
                <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface to-ink-2 p-8 shadow-soft flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                      {event.category}
                    </span>
                    <span className="text-xs font-bold text-faint">
                      {event.dateLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-black italic tracking-tighter text-brand/20 select-none">
                      TXF
                    </span>
                    <p className="mt-2 font-display text-xl font-bold text-fg line-clamp-2">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {event.venue}, {event.city}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Event Facts Strip */}
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

      {/* Main Grid: Content Column + Sticky Booking Rail */}
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,380px)] lg:gap-12 lg:py-10">
        {/* Main Column */}
        <div className="space-y-10">
          <section id="about" className="scroll-mt-24">
            <SectionTitle>About this event</SectionTitle>
            <EventProse text={event.about} />
          </section>

          {agenda.length > 0 && (
            <section id="schedule" className="scroll-mt-24">
              <SectionTitle>
                {agenda.length > 3 ? "Schedule" : "Agenda"}
              </SectionTitle>
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
            <section id="speakers" className="scroll-mt-24">
              <SectionTitle>Speakers</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {event.speakers.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 shadow-soft transition-all hover:border-brand/40"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-join text-sm font-bold text-white shadow-sm">
                      {s.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-fg truncate">{s.name}</p>
                      <p className="text-xs text-muted truncate mt-0.5">{s.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div id="where" className="scroll-mt-24">
            <EventWhereBlock
              venue={event.venue}
              address={event.address}
              city={event.city}
              latitude={event.latitude}
              longitude={event.longitude}
            />
          </div>

          {event.highlights && event.highlights.length > 0 && (
            <section id="good-to-know" className="scroll-mt-24">
              <SectionTitle>Good to know</SectionTitle>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {event.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted shadow-soft"
                  >
                    <span className="mt-0.5 shrink-0 font-bold text-brand" aria-hidden>✓</span>
                    <span className="text-fg/90">{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div id="organiser" className="scroll-mt-24">
            <EventOrganizer
              hostId={event.hostId}
              hostName={event.hostName}
              eventsHosted={organizer?.hosted}
              followers={organizer?.followers}
            />
          </div>

          {!isFree && event.refundPolicy && (
            <section id="refunds" className="scroll-mt-24">
              <SectionTitle>Refunds &amp; cancellation</SectionTitle>
              <div className="mt-3 rounded-2xl border border-line bg-surface p-5 text-sm leading-relaxed text-muted shadow-soft">
                <div className="flex items-center gap-2 mb-2 text-fg font-semibold text-xs uppercase tracking-wider">
                  <svg className="h-4 w-4 text-brand" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                  </svg>
                  <span>Policy &amp; Terms</span>
                </div>
                <p className="whitespace-pre-wrap">{event.refundPolicy}</p>
              </div>
            </section>
          )}

          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-faint mr-1">
                Topics
              </span>
              {event.tags.map((t) => (
                <Link
                  key={t}
                  href={`/events?tag=${encodeURIComponent(t)}`}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted transition-colors hover:border-brand hover:text-brand shadow-sm"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Unified Sticky Booking Rail */}
        <aside className="space-y-4 lg:pt-0">
          <div className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100svh-5rem)] lg:overflow-y-auto pr-0.5">
            {/* Unified Booking Card */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6 space-y-5">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
                    Admission
                  </p>
                  <p className="mt-0.5 font-display text-2xl font-bold text-fg">
                    {isFree ? "Free" : event.priceLabel}
                  </p>
                </div>
                <div className="text-right">
                  <span className="shrink-0 text-xs font-semibold text-muted">
                    {event.spotsLeft} of {event.capacity} left
                  </span>
                  <p className="text-[10px] text-faint">seats remaining</p>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="h-2 overflow-hidden rounded-full bg-ink-2">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Already Registered Tickets Panel */}
              {userRegistrations.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-brand/20 bg-brand/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand">
                      Your Ticket
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      Confirmed
                    </span>
                  </div>

                  {userRegistrations.map((reg) => {
                    const isWaitlisted = reg.status === "waitlisted";
                    return (
                      <div
                        key={reg.id}
                        className={`flex flex-col items-center justify-center rounded-xl bg-surface p-4 border shadow-sm ${
                          isWaitlisted ? "border-amber-500/30" : "border-brand/20"
                        }`}
                      >
                        {isWaitlisted ? (
                          <>
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                              Waitlisted
                            </span>
                            <span className="mt-2 text-xs text-muted text-center">
                              {reg.attendee_name} — we&apos;ll notify you if a spot opens.
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-bold tracking-wider text-faint mb-1">TICKET PASS</span>
                            <span className="font-mono text-xl font-bold text-fg tracking-widest">{reg.ticket_code.toUpperCase()}</span>
                            <span className="text-xs text-muted mt-1 mb-3">{reg.attendee_name}</span>
                            <DownloadTicketBtn event={event} ticketCode={reg.ticket_code} attendeeName={reg.attendee_name} />
                          </>
                        )}
                        <div className="mt-2">
                          {reg.payment_id ? (
                            <a
                              href="/contact"
                              className="text-xs text-faint underline hover:text-muted"
                            >
                              Need to cancel? Contact support
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

              {/* Primary Register CTA Button */}
              <RegisterCta
                eventTitle={event.title}
                eventId={event.id || ""}
                isFull={event.spotsLeft <= 0}
                isPaid={event.price === "Paid"}
                priceLabel={memberPriceLabel ?? event.priceLabel}
                spotsLeft={event.spotsLeft}
                hasTicket={hasTicket}
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

              {/* Integrated Actions: Add to Calendar and Share */}
              <div className="border-t border-line/70 pt-4">
                <EventActions
                  title={event.title}
                  dateISO={event.date}
                  time={event.time}
                  location={`${event.venue}, ${event.address}`}
                  details={event.blurb}
                />
              </div>

              {/* Organizer Micro-line */}
              {event.hostName && (
                <div className="flex items-center justify-between text-xs border-t border-line/70 pt-3 text-muted">
                  <span>Host</span>
                  {event.hostId ? (
                    <Link
                      href={`/organizer/${event.hostId}`}
                      className="font-semibold text-brand-soft hover:underline"
                    >
                      {event.hostName} →
                    </Link>
                  ) : (
                    <span className="font-semibold text-fg">{event.hostName}</span>
                  )}
                </div>
              )}

              {/* Member Perk Reassurance */}
              <p className="text-center text-xs text-faint">
                Members get priority registration &amp; discounts.{" "}
                <Link href="/membership" className="text-brand-soft underline font-medium">
                  Join
                </Link>
              </p>
            </div>

            {/* "On this page" Navigation Card */}
            <EventSectionNav sections={sections} />
          </div>
        </aside>
      </div>

      {/* Related Events Section */}
      <RelatedEvents current={event} all={allEvents} />
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
      {children}
    </h2>
  );
}
