import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbEventToTXF, type DBEvent } from "@/lib/events-map";
import { EventCard } from "@/components/EventCard";
import { FollowOrganizerBtn } from "@/components/FollowOrganizerBtn";
import { Section } from "@/components/Section";

type Organizer = {
  id: string;
  name: string | null;
  city: string | null;
  bio: string | null;
  linkedin: string | null;
  events_count: number;
  followers: number;
};

async function getOrganizer(id: string): Promise<Organizer | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_organizer", { p_id: id });
    return (data as Organizer) ?? null;
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
  return {
    title: `${org.name ?? "Organizer"} · Events`,
    description:
      org.bio ??
      `Events hosted by ${org.name ?? "this organizer"} on Techxfluence.`,
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
  const { data: rows } = await supabase
    .from("events")
    .select(
      "id,slug,title,category,date,date_label,time,city,venue,address,price_type,price_label,blurb,about,spots_left,capacity,image_url,starts_at,ends_at",
    )
    .eq("host_id", id)
    .eq("status", "published")
    .gte("date", today)
    .order("date", { ascending: true });

  const events = ((rows ?? []) as DBEvent[]).map(dbEventToTXF);
  const initials = (org.name ?? "O")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="border-b border-line bg-ink-2">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-center sm:px-8">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-join font-display text-2xl font-bold text-white">
            {initials}
          </span>

          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
              Organizer
            </span>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              {org.name ?? "Organizer"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {org.city ? `${org.city} · ` : ""}
              {org.events_count} event{org.events_count === 1 ? "" : "s"} hosted
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

          <FollowOrganizerBtn organizerId={org.id} initialFollowers={org.followers} />
        </div>
      </header>

      <Section>
        <h2 className="font-display text-2xl font-bold text-fg">
          Upcoming events
        </h2>
        {events.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
            <p className="font-display text-lg text-fg">Nothing scheduled yet.</p>
            <p className="mt-1 text-sm text-muted">
              Follow along to hear about their next one.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
