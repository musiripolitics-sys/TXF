import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { JoinCommunityBtn } from "@/components/JoinCommunityBtn";
import {
  getCommunityBySlug,
  getMembership,
  getMembers,
  getCommunityEvents,
} from "@/lib/communities";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}

const roleLabel: Record<string, string> = {
  organizer: "Organiser",
  co_organizer: "Co-organiser",
  host: "Host",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const community = await getCommunityBySlug(supabase, slug);
  if (!community) return { title: "Chapter not found" };

  return {
    title: community.name,
    description:
      community.tagline ??
      `${community.name} — a Techxfluence chapter. ${community.member_count} members.`,
    alternates: { canonical: `/c/${community.slug}` },
  };
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const community = await getCommunityBySlug(supabase, slug);
  if (!community) notFound();

  const user = await getCurrentUser();
  const [membership, members, events] = await Promise.all([
    user ? getMembership(supabase, community.id, user.id) : Promise.resolve(null),
    getMembers(supabase, community.id),
    getCommunityEvents(supabase, community.id),
  ]);

  const leads = members.filter((m) => m.role !== "member");

  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-ink-2">
        {community.cover_image ? (
          <>
            <Image src={community.cover_image} alt="" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-black/70" />
          </>
        ) : (
          <div className="pointer-events-none absolute inset-0 glow-brand" aria-hidden />
        )}
        <div className={`relative mx-auto max-w-5xl px-5 py-12 sm:px-8 ${community.cover_image ? "text-white" : "text-fg"}`}>
          <Link
            href="/communities"
            className={`text-sm ${community.cover_image ? "text-white/70 hover:text-white" : "text-muted hover:text-fg"}`}
          >
            ← All chapters
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${community.cover_image ? "bg-white/15 text-white" : "bg-brand/10 text-brand-soft"}`}>
              {community.kind === "city" ? "City chapter" : "Topic chapter"}
            </span>
            {community.city && (
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${community.cover_image ? "bg-white/15 text-white" : "border border-line text-muted"}`}>
                {community.city}
              </span>
            )}
          </div>

          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl text-balance">
            {community.name}
          </h1>
          {community.tagline && (
            <p className={`mt-3 max-w-2xl text-lg ${community.cover_image ? "text-white/80" : "text-muted"}`}>
              {community.tagline}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <JoinCommunityBtn
              communityId={community.id}
              slug={community.slug}
              name={community.name}
              initialState={(membership?.state as "active" | "pending") ?? null}
              memberCount={community.member_count}
            />
            {events.pastCount > 0 && (
              <span className={`text-sm ${community.cover_image ? "text-white/70" : "text-faint"}`}>
                · {events.pastCount} past {events.pastCount === 1 ? "event" : "events"}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          {community.description && (
            <section>
              <h2 className="font-display text-xl font-semibold text-fg">About</h2>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted">
                {community.description}
              </p>
            </section>
          )}

          <section>
            <h2 className="font-display text-xl font-semibold text-fg">
              Upcoming events
            </h2>
            {events.upcoming.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line px-5 py-8 text-center text-sm text-faint">
                Nothing scheduled yet. Join the chapter and you&rsquo;ll hear first.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {events.upcoming.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/events/${e.slug}`}
                      className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-brand-soft">
                          {e.date_label ?? e.date}
                        </span>
                        <span className="mt-0.5 block truncate font-medium text-fg">
                          {e.title}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted">
                          {[e.venue, e.city].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-fg">
                        {e.price_label ?? "Free"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {events.past.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-fg">
                Past events{" "}
                <span className="text-sm font-normal text-faint">
                  ({events.pastCount})
                </span>
              </h2>
              <ul className="mt-4 flex flex-col gap-2">
                {events.past.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/events/${e.slug}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-2"
                    >
                      <span className="truncate text-muted">{e.title}</span>
                      <span className="shrink-0 text-xs text-faint">
                        {e.date_label ?? e.date}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {leads.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-display text-base font-bold text-fg">Organisers</h3>
              <div className="mt-3 flex flex-col gap-3">
                {leads.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-join text-xs font-bold text-white">
                      {initials(m.full_name ?? "?")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">
                        {m.full_name ?? "Member"}
                      </p>
                      <p className="text-xs text-faint">{roleLabel[m.role] ?? "Member"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {members.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-base font-bold text-fg">Members</h3>
                <span className="text-sm text-faint">{community.member_count}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {members.slice(0, 18).map((m) => (
                  <span
                    key={m.user_id}
                    title={m.full_name ?? "Member"}
                    className="grid h-9 w-9 place-items-center rounded-full bg-ink-2 text-[11px] font-bold text-faint"
                  >
                    {initials(m.full_name ?? "?")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {community.topics.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-display text-base font-bold text-fg">Topics</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {community.topics.map((t) => (
                  <Link
                    key={t}
                    href={`/events?tag=${encodeURIComponent(t)}`}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-brand"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {membership?.state === "active" && (
            <Link
              href="/community"
              className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand/40"
            >
              <span>
                <span className="block font-display text-base font-bold text-fg">
                  Discussions
                </span>
                <span className="mt-0.5 block text-sm text-muted">
                  Talk to the rest of the chapter
                </span>
              </span>
              <Icon name="users" className="h-5 w-5 shrink-0 text-brand-soft" strokeWidth={1.7} />
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
