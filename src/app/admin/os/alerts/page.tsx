import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/os/ui";
import { shortDate, inr } from "@/lib/bos";

export const metadata = { title: "Alerts · Business OS" };

type Alert = { tone: "bad" | "warn"; text: string; href: string; when?: string };

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export default async function AlertsPage() {
  const supabase = await createClient();
  const t = today();
  const soon = inDays(7);
  const soon30 = inDays(30);

  const [
    { data: tasks },
    { data: approvals },
    { data: risks },
    { data: campaigns },
    { data: legal },
    { data: vendors },
    { data: goals },
  ] = await Promise.all([
    supabase.from("tasks").select("id,title,due_date,status,budget,actual_cost"),
    supabase.from("approvals").select("id,request_title,decision"),
    supabase.from("risks").select("id,risk,risk_score,status"),
    supabase.from("campaigns").select("id,name,budget,actual_spend"),
    supabase.from("legal_items").select("id,requirement,expiry_date,due_date,status"),
    supabase.from("vendors").select("id,name,end_date"),
    supabase.from("goals").select("id,objective,end_date,status"),
  ]);

  const alerts: { group: string; items: Alert[] }[] = [];
  const add = (group: string, items: Alert[]) => items.length && alerts.push({ group, items });

  const openTask = (s: string) => s !== "completed" && s !== "cancelled";

  add("Overdue tasks", (tasks ?? [])
    .filter((x) => x.due_date && x.due_date < t && openTask(x.status))
    .map((x) => ({ tone: "bad" as const, text: x.title, href: "/admin/os/tasks?view=overdue", when: shortDate(x.due_date) })));

  add("Blocked tasks", (tasks ?? [])
    .filter((x) => x.status === "blocked")
    .map((x) => ({ tone: "warn" as const, text: x.title, href: "/admin/os/tasks?view=blocked" })));

  add("Budget overruns", [
    ...(tasks ?? [])
      .filter((x) => (x.actual_cost ?? 0) > (x.budget ?? 0) && (x.budget ?? 0) > 0)
      .map((x) => ({ tone: "warn" as const, text: `${x.title} — spent ${inr(x.actual_cost)} of ${inr(x.budget)}`, href: "/admin/os/tasks" })),
    ...(campaigns ?? [])
      .filter((x) => (x.actual_spend ?? 0) > (x.budget ?? 0) && (x.budget ?? 0) > 0)
      .map((x) => ({ tone: "warn" as const, text: `${x.name} — spent ${inr(x.actual_spend)} of ${inr(x.budget)}`, href: "/admin/os/campaigns" })),
  ]);

  add("Pending approvals", (approvals ?? [])
    .filter((x) => x.decision === "pending")
    .map((x) => ({ tone: "warn" as const, text: x.request_title, href: "/admin/os/approvals" })));

  add("Critical risks", (risks ?? [])
    .filter((x) => (x.risk_score ?? 0) >= 15 && x.status !== "completed" && x.status !== "cancelled")
    .map((x) => ({ tone: "bad" as const, text: `${x.risk} (score ${x.risk_score})`, href: "/admin/os/risks" })));

  add("Upcoming deadlines (7 days)", [
    ...(goals ?? [])
      .filter((x) => x.end_date && x.end_date >= t && x.end_date <= soon && x.status !== "completed")
      .map((x) => ({ tone: "warn" as const, text: x.objective, href: "/admin/os/roadmap", when: shortDate(x.end_date) })),
    ...(legal ?? [])
      .filter((x) => x.due_date && x.due_date >= t && x.due_date <= soon && x.status !== "completed")
      .map((x) => ({ tone: "warn" as const, text: x.requirement, href: "/admin/os/legal", when: shortDate(x.due_date) })),
  ]);

  add("Expiring contracts (30 days)", [
    ...(legal ?? [])
      .filter((x) => x.expiry_date && x.expiry_date >= t && x.expiry_date <= soon30)
      .map((x) => ({ tone: "warn" as const, text: `${x.requirement} expires`, href: "/admin/os/legal", when: shortDate(x.expiry_date) })),
    ...(vendors ?? [])
      .filter((x) => x.end_date && x.end_date >= t && x.end_date <= soon30)
      .map((x) => ({ tone: "warn" as const, text: `${x.name} contract ends`, href: "/admin/os/vendors", when: shortDate(x.end_date) })),
  ]);

  const total = alerts.reduce((a, g) => a + g.items.length, 0);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Alerts</h1>
        <p className="text-sm text-muted">
          {total > 0 ? `${total} thing${total === 1 ? "" : "s"} need attention.` : "Everything's on track."}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState title="No alerts 🎉" hint="No overdue tasks, overruns, pending approvals or expiring contracts." />
      ) : (
        <div className="space-y-6">
          {alerts.map((g) => (
            <div key={g.group}>
              <h2 className="mb-2 font-display text-sm font-semibold text-fg">
                {g.group} <span className="text-faint">({g.items.length})</span>
              </h2>
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {g.items.map((a, i) => (
                    <li key={i}>
                      <Link href={a.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                        <span className="flex items-center gap-2 text-sm text-fg">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${a.tone === "bad" ? "bg-red-500" : "bg-amber-500"}`} />
                          {a.text}
                        </span>
                        {a.when && <span className="shrink-0 text-xs text-muted">{a.when}</span>}
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
