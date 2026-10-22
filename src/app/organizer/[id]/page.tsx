import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAttendance } from "@/lib/events";
import { dbEventToTXF, type DBEvent } from "@/lib/events-map";
import { categoryTheme, type EventCategory } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { FollowOrganizerBtn } from "@/components/FollowOrganizerBtn";
import { Icon } from "@/components/Icon";
import { OrganizerJsonLd } from "@/components/OrganizerJsonLd";
import { OrganizerPastEvents } from "@/components/OrganizerPastEvents";
import { OrganizerStats } from "@/components/OrganizerStats";
import { Section } from "@/components/Section";

type Organizer = {
  id: string;
  name: string | null;
  city: string | null;
  bio: string | null;
  linkedin: string | null;
  avatar: string | null;
  events_count: number;
  upcoming_count: number;
  past_count: number;
  attendees: number;
  hosting_since: string | null;
  cities: string[];
  categories: string[];
  followers: number;
};

const EVENT_COLUMNS =
  "id,slug,title,category,date,date_label,time,city,venue,address,price_type,price_label,blurb,about,spots_left,capacity,image_url,starts_at,ends_at";

/**
 * The organiser, with every field defaulted.
 *
 * get_organizer grew six new keys in 0059 and the page reads all of them, so
 * until that migration is applied this would otherwise render "undefined
 * hosted" and crash on `cities.map`. Defaulting here means an unmigrated
 * database shows the page it showed before rather than an error.
 */
async function getOrganizer(id: string): Promise<Organizer | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_organizer", { p_id: id });
    if (!data) return null;
    const o = data as Partial<Organizer> & { id: string };
    return {
      id: o.id,
      name: o.name ?? null,
      city: o.city ?? null,
      bio: o.bio ?? null,
      linkedin: o.linkedin ?? null,
      avatar: o.avatar ?? null,
      events_count: o.events_count ?? 0,
      upcoming_count: o.upcoming_count ?? 0,
      past_count: o.past_count ?? 0,
      attendees: o.attendees ?? 0,
      hosting_since: o.hosting_since ?? null,
      cities: Array.isArray(o.cities) ? o.cities.filter(Boolean) : [],
      categories: Array.isArray(o.categories) ? o.categories.filter(Boolean) : [],
      followers: o.followers ?? 0,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const org = await getOrganizer(id);
  if (!org) return { title: "Organizer not found" };

  const name = org.name ?? "Organizer";
  const url = `/organizer/${org.id}`;
  const description =
    org.bio ??
    `${name} has hosted ${org.events_count} event${
      org.events_count === 1 ? "" : "s"
    } on Techxfluence${org.cities.length > 0 ? ` in ${org.cities.join(", ")}` : ""}.`;

  return {
    title: `${name} · Events`,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", url, title: name, description },
    twitter: { card: "summary", title: name, description },
  };
}

export default async function OrganizerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await getOrganizer(id);
  if (!org) notFound();

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Two halves of the same record, so they are asked for together rather than
  // one after the other.
  const [{ data: upcomingRows }, { data: pastRows }] = await Promise.all([
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("host_id", id)
      .eq("status", "published")
      .gte("date", today)
      .order("date", { ascending: true }),
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("host_id", id)
      .eq("status", "published")
      .lt("date", today)
      .order("date", { ascending: false })
      .limit(8),
  ]);

  const events = ((upcomingRows ?? []) as DBEvent[]).map(dbEventToTXF);
  const past = ((pastRows ?? []) as DBEvent[]).map(dbEventToTXF);

  // Who's going, and who went. One call for both lists.
  const attendance = await getAttendance(
    [...events, ...past].map((e) => e.id).filter((x): x is string => !!x),
  );

  const name = org.name ?? "Organizer";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Only the categories the app has a theme for. The column is an enum, so an
  // unknown value means the enum moved ahead of the front end — skipping it
  // beats rendering a chip with no icon and no colour.
  const topics = org.categories.filter(
    (c): c is EventCategory => c in categoryTheme,
  );

  return (
    <>
      <OrganizerJsonLd
        id={org.id}
        name={name}
        bio={org.bio}
        city={org.city}
        avatar={org.avatar}
        linkedin={org.linkedin}
        followers={org.followers}
        eventsCount={org.events_count}
      />

      <header className="border-b border-line bg-ink-2">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
          <Link
            href="/events"
            className="text-xs font-medium text-muted hover:text-brand"
          >
            ← All events
          </Link>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            {org.avatar ? (
              <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line">
                {/* unoptimized: avatars are whatever URL the organiser saved,
                    and this project configures no image remotePatterns. */}
                <Image
                  src={org.avatar}
                  alt={name}
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-cover"
                />
              </span>
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-join font-display text-2xl font-bold text-white">
                {initials}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
                Organizer
              </span>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                {name}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {[
                  org.city,
                  `${org.events_count} event${org.events_count === 1 ? "" : "s"} hosted`,
                  org.upcoming_count > 0
                    ? `${org.upcoming_count} coming up`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {org.bio && (
                <p className="mt-3 max-w-2xl text-sm text-muted">{org.bio}</p>
              )}
              {org.linkedin && (
                <a
                  href={org.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-brand-soft hover:underline"
                >
                  Connect on LinkedIn →
                </a>
              )}
            </div>

            <FollowOrganizerBtn
              organizerId={org.id}
              initialFollowers={org.followers}
            />
          </div>

          <div className="mt-8">
            <OrganizerStats
              eventsCount={org.events_count}
              upcoming={org.upcoming_count}
              past={org.past_count}
              attendees={org.attendees}
              followers={org.followers}
              hostingSince={org.hosting_since}
            />
          </div>
        </div>
      </header>

      {(topics.length > 0 || org.cities.length > 0) && (
        <div className="border-b border-line">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-6 sm:px-8">
            {topics.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
                  Runs
                </span>
                {topics.map((c) => (
                  <Link
                    key={c}
                    href={`/events?category=${encodeURIComponent(c)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg transition-colors hover:border-brand hover:text-brand"
                  >
                    <Icon
                      name={categoryTheme[c].icon}
                      className="h-3.5 w-3.5"
                      strokeWidth={1.8}
                    />
                    {c}
                  </Link>
                ))}
              </div>
            )}

            {org.cities.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
                  In
                </span>
                {org.cities.map((c) => (
                  <Link
                    key={c}
                    href={`/events?city=${encodeURIComponent(c)}`}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg transition-colors hover:border-brand hover:text-brand"
                  >
                    {c}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Section>
        <h2 className="font-display text-2xl font-bold text-fg">
          Upcoming events
        </h2>
        {events.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
            <p className="font-display text-lg text-fg">Nothing scheduled yet.</p>
            <p className="mt-1 text-sm text-muted">
              {org.past_count > 0
                ? "Follow along to hear about their next one — their last events are below."
                : "Follow along to hear about their next one."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard
                key={e.slug}
                event={e}
                attendance={e.id ? attendance[e.id] : undefined}
              />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold text-fg">
              Previously
            </h2>
            <p className="mt-1 text-sm text-muted">
              {org.past_count > past.length
                ? `The last ${past.length} of ${org.past_count} events they have run.`
                : `What they have run so far.`}
            </p>
            <OrganizerPastEvents events={past} attendance={attendance} />
          </div>
        )}
      </Section>
    </>
  );
}
