import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCommunities } from "@/lib/communities";

export const metadata: Metadata = {
  title: "Chapters",
  description:
    "Techxfluence chapters — city and topic communities you join once and come back to. Find the one near you.",
  alternates: { canonical: "/communities" },
};

export default async function CommunitiesPage() {
  const supabase = await createClient();
  const communities = await getCommunities(supabase);

  const cities = communities.filter((c) => c.kind === "city");
  const topics = communities.filter((c) => c.kind === "topic");

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
        Chapters
      </span>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        Find your chapter
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        A chapter is the thing you join once and keep coming back to — your city,
        or the subject you care about. Events happen inside them.
      </p>

      {communities.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-lg text-fg">No chapters yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Chapters are being set up. In the meantime, everything is on the
            events page.
          </p>
          <Link
            href="/events"
            className="mt-5 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Browse events
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {cities.length > 0 && <Group title="By city" items={cities} />}
          {topics.length > 0 && <Group title="By topic" items={topics} />}
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getCommunities>>;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold text-fg">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/c/${c.slug}`}
            className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-soft"
          >
            <h3 className="font-display text-base font-bold text-fg transition-colors group-hover:text-brand">
              {c.name}
            </h3>
            {c.tagline && (
              <p className="mt-1.5 line-clamp-2 text-sm text-muted">{c.tagline}</p>
            )}
            <p className="mt-auto pt-4 text-sm text-faint">
              {c.member_count} {c.member_count === 1 ? "member" : "members"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
