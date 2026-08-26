import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getGates, getBalance, getGroupFiles } from "@/lib/community";
import { GroupFiles } from "@/components/GroupFiles";
import { GroupFileUpload } from "@/components/GroupFileUpload";

/**
 * A session group's home — the recap, the downloads shelf and who else was
 * there. Access is decided by the database: a non-attendee's queries return
 * nothing under RLS, so this page 404s for them.
 */
export default async function GroupPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/community/g/${eventId}`);

  const supabase = await createClient();
  const [admin, { data: event }, { data: attended }] = await Promise.all([
    isAdmin(),
    supabase
      .from("events")
      .select("id, title, date_label, city, venue")
      .eq("id", eventId)
      .maybeSingle(),
    supabase
      .from("registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "attended")
      .maybeSingle(),
  ]);

  if (!event) notFound();
  // Membership is attendance. Admins can look in.
  if (!attended && !admin) notFound();

  const [files, gates, balance, { data: peers }] = await Promise.all([
    getGroupFiles(supabase, eventId, user.id),
    getGates(supabase),
    getBalance(supabase, user.id),
    supabase
      .from("registrations")
      .select("attendee_name")
      .eq("event_id", eventId)
      .eq("status", "attended")
      .limit(24),
  ]);

  const attendees = (peers ?? []).map((p) => p.attendee_name).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/community" className="text-sm text-muted hover:text-fg">
        ← Community
      </Link>

      <span className="mt-6 block text-xs font-semibold uppercase tracking-wider text-brand-soft">
        Session group
      </span>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg">
        {event.title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {[event.date_label, event.venue, event.city].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-1 text-sm text-faint">
        Private to the {attendees.length || "—"} {attendees.length === 1 ? "person" : "people"} who
        attended.
      </p>

      <GroupFiles files={files} balance={balance} isAdmin={admin} />
      {admin && <GroupFileUpload eventId={eventId} />}

      {attendees.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-fg">Who was there</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {attendees.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted"
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 rounded-xl border border-line bg-surface-2 px-5 py-6">
        <h2 className="font-display text-lg font-bold text-fg">The conversation</h2>
        <p className="mt-1.5 text-sm text-muted">
          This group&rsquo;s posts live in the feed, where you can sort and reply.
        </p>
        <Link
          href="/community"
          className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Open the feed
        </Link>
        {gates.post_group?.minBalance ? (
          <p className="mt-3 text-xs text-faint">
            Posting here needs {gates.post_group.minBalance} credits — you have {balance}.
          </p>
        ) : null}
      </section>
    </div>
  );
}
