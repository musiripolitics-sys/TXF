import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CommunityFeed } from "@/components/CommunityFeed";

export const metadata = {
  title: "Community",
  description: "What the Techxfluence community is talking about.",
};

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/community");
  const admin = await isAdmin();

  // Session groups = events this member has attended (checked in to).
  const supabase = await createClient();
  const { data: attendedRegs } = await supabase
    .from("registrations")
    .select("event_id, events(id, title)")
    .eq("user_id", user.id)
    .eq("status", "attended");

  const seen = new Set<string>();
  const eventGroups: { id: string; title: string }[] = [];
  for (const r of attendedRegs ?? []) {
    const ev = r.events as unknown as { id: string; title: string } | null;
    if (ev && !seen.has(ev.id)) {
      seen.add(ev.id);
      eventGroups.push({ id: ev.id, title: ev.title });
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
        Community
      </span>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg">
          The feed
        </h1>
        <a
          href="/directory"
          className="mt-2 shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-fg hover:border-brand hover:text-brand"
        >
          Member directory →
        </a>
      </div>
      <p className="mt-2 text-sm text-muted">
        Pick a channel, share wins, ask questions. Session groups are private to
        attendees of that event.
      </p>

      <CommunityFeed
        currentUserId={user.id}
        isAdmin={admin}
        eventGroups={eventGroups}
      />
    </div>
  );
}
