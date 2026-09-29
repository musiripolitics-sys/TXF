import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/os/ui";
import { shortDate } from "@/lib/bos";
import { requireSection } from "@/lib/os-access";

export const metadata = { title: "Calendar · Business OS" };

type Item = { date: string; type: string; color: string; label: string; href: string };

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export default async function CalendarPage() {
  await requireSection("plan");
  const supabase = await createClient();

  const [
    { data: events },
    { data: content },
    { data: campaigns },
    { data: tasks },
    { data: goals },
    { data: legal },
    { data: hiring },
    { data: podcast },
  ] = await Promise.all([
    supabase.from("events").select("id,title,slug,date").order("date"),
    supabase.from("content_items").select("id,topic,content_date"),
    supabase.from("campaigns").select("id,name,start_date"),
    supabase.from("tasks").select("id,title,due_date,status,completed_at"),
    supabase.from("goals").select("id,objective,end_date"),
    supabase.from("legal_items").select("id,requirement,due_date,expiry_date"),
    supabase.from("hiring_plan").select("id,role,target_month"),
    supabase.from("podcast_episodes").select("id,title,recording_date"),
  ]);

  const items: Item[] = [];
  const push = (date: string | null, type: string, color: string, label: string, href: string) => {
    if (date) items.push({ date: date.slice(0, 10), type, color, label, href });
  };

  for (const e of events ?? []) push(e.date, "Event", "#f59e0b", e.title, `/events/${e.slug}`);
  for (const c of content ?? []) push(c.content_date, "Content", "#8b5cf6", c.topic ?? "Content", "/admin/os/content");
  for (const c of campaigns ?? []) push(c.start_date, "Campaign", "#ec4899", c.name, "/admin/os/campaigns");
  // Tasks appear twice over their life: on the day they are due, and again on
  // the day they were actually finished. Seeing both is the point — the gap
  // between them is what the calendar is for.
  const todayIso = new Date().toISOString().slice(0, 10);
  for (const x of tasks ?? []) {
    if (x.status === "cancelled") continue;
    if (x.status === "completed") {
      push(x.completed_at ?? null, "Task done", "#22c55e", x.title, "/admin/os/tasks");
      continue;
    }
    const overdue = !!x.due_date && x.due_date.slice(0, 10) < todayIso;
    push(
      x.due_date,
      overdue ? "Task overdue" : "Task due",
      overdue ? "#ef4444" : "#2563eb",
      x.title,
      overdue ? "/admin/os/tasks?view=overdue" : "/admin/os/tasks",
    );
  }
  for (const g of goals ?? []) push(g.end_date, "Goal", "#22c55e", g.objective, "/admin/os/roadmap");
  for (const l of legal ?? []) { push(l.due_date, "Legal due", "#64748b", l.requirement, "/admin/os/legal"); push(l.expiry_date, "Legal expiry", "#ef4444", `${l.requirement} expires`, "/admin/os/legal"); }
  for (const h of hiring ?? []) push(h.target_month, "Hiring", "#a855f7", h.role, "/admin/os/hiring");
  for (const p of podcast ?? []) push(p.recording_date, "Podcast", "#06b6d4", p.title, "/admin/os/podcast");

  items.sort((a, b) => a.date.localeCompare(b.date));

  // Group by month
  const byMonth = new Map<string, Item[]>();
  for (const it of items) {
    const k = it.date.slice(0, 7);
    (byMonth.get(k) ?? byMonth.set(k, []).get(k)!).push(it);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Business Calendar</h1>
        <p className="text-sm text-muted">Every dated record in the OS on one timeline — tasks due and done, goals, events, content, campaigns, hiring and renewals.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing scheduled yet" hint="Dated records across the OS show up here automatically." />
      ) : (
        <div className="space-y-6">
          {[...byMonth.entries()].map(([month, list]) => (
            <div key={month}>
              <h2 className="mb-2 font-display text-sm font-semibold text-fg">{monthLabel(month)}</h2>
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {list.map((it, i) => (
                    <li key={i}>
                      <Link href={it.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                        <span className="w-16 shrink-0 text-xs tabular-nums text-muted">{shortDate(it.date).replace(/,.*/, "")}</span>
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]" style={{ background: `${it.color}1a`, color: it.color }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: it.color }} />
                          {it.type}
                        </span>
                        <span className="truncate text-sm text-fg">{it.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
