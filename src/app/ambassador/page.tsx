import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isAmbassador, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, KpiCard, EmptyState } from "@/components/os/ui";
import { num, shortDate } from "@/lib/bos";

export const metadata = { title: "Ambassador Portal" };

export default async function AmbassadorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/ambassador");

  const [amb, admin] = await Promise.all([isAmbassador(), isAdmin()]);
  if (!amb && !admin) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-fg">Ambassador portal</h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re signed in as {user.email}. Ask an admin to enrol you in the College Ambassador
          program to see your portal.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: rows }, { data: events }] = await Promise.all([
    supabase.from("ambassadors").select("*").eq("user_id", user.id),
    supabase.from("events").select("id,title,slug,city,date").eq("status", "published").gte("date", new Date().toISOString().slice(0, 10)).order("date").limit(12),
  ]);

  const mine = rows ?? [];
  const sum = (k: string) => mine.reduce((a, r) => a + Number((r as Record<string, unknown>)[k] ?? 0), 0);
  const colleges = [...new Set(mine.map((r) => r.college).filter(Boolean))];

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Ambassador Portal</h1>
        <p className="text-sm text-muted">
          {colleges.length ? colleges.join(", ") : "Your college activities and performance"}
          {admin && !amb && " · (admin preview)"}
        </p>
      </div>

      {mine.length === 0 ? (
        <EmptyState title="You're not enrolled yet" hint="An admin needs to link your account in the College Ambassadors module." />
      ) : (
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Events promoted" value={num(sum("events_promoted"))} tone="brand" />
          <KpiCard label="Leads" value={num(sum("leads"))} />
          <KpiCard label="Registrations" value={num(sum("registrations"))} />
          <KpiCard label="Members acquired" value={num(sum("members_acquired"))} tone="good" />
        </div>
      )}

      <h2 className="mb-2 font-display text-sm font-semibold text-fg">Events to promote</h2>
      {(events ?? []).length === 0 ? (
        <EmptyState title="No upcoming events" hint="Published events will appear here to share." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {(events ?? []).map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.slug}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                  <div>
                    <p className="font-medium text-fg">{e.title}</p>
                    <p className="text-xs text-muted">{e.city} · {shortDate(e.date)}</p>
                  </div>
                  <span className="text-xs text-brand-soft">Share ↗</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
