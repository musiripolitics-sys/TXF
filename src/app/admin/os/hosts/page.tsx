import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, KpiCard } from "@/components/os/ui";
import { inr, num, shortDate } from "@/lib/bos";

export const metadata = { title: "Hosts · Business OS" };

export default async function HostsPage() {
  const supabase = await createClient();

  const [{ data: hosts }, { data: submissions }, { data: events }, { data: earnings }] = await Promise.all([
    supabase.from("users").select("id,full_name,email,host_status,created_at").eq("primary_role", "event_host").order("full_name"),
    supabase.from("host_submissions").select("organizer_id,status"),
    supabase.from("events").select("host_id,status"),
    supabase.rpc("get_all_host_earnings"),
  ]);

  const proposed = new Map<string, number>();
  for (const s of submissions ?? []) if (s.organizer_id) proposed.set(s.organizer_id, (proposed.get(s.organizer_id) ?? 0) + 1);

  const created = new Map<string, number>();
  const completed = new Map<string, number>();
  for (const e of events ?? []) {
    if (!e.host_id) continue;
    created.set(e.host_id, (created.get(e.host_id) ?? 0) + 1);
    if (e.status === "completed") completed.set(e.host_id, (completed.get(e.host_id) ?? 0) + 1);
  }

  const gross = new Map<string, number>();
  for (const r of (earnings as { host_id: string; gross: number }[]) ?? []) gross.set(r.host_id, Number(r.gross ?? 0));

  const rows = (hosts ?? []).map((h) => ({
    ...h,
    proposed: proposed.get(h.id) ?? 0,
    created: created.get(h.id) ?? 0,
    completed: completed.get(h.id) ?? 0,
    revenue: gross.get(h.id) ?? 0,
  }));

  const pendingApps = (submissions ?? []).filter((s) => s.status === "pending").length;
  const totalRevenue = rows.reduce((a, r) => a + r.revenue, 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Host Management</h1>
          <p className="text-sm text-muted">
            Third-party hosts and their performance. Approvals happen in the{" "}
            <Link href="/admin" className="text-brand-soft hover:underline">admin console</Link>.
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Active hosts" value={num(rows.length)} />
        <KpiCard label="Pending applications" value={num(pendingApps)} href="/admin" tone={pendingApps ? "warn" : "default"} />
        <KpiCard label="Events completed" value={num(rows.reduce((a, r) => a + r.completed, 0))} />
        <KpiCard label="Host revenue (gross)" value={inr(totalRevenue)} tone="good" />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No hosts yet" hint="Approved hosts from the admin console appear here." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
                <th className="px-4 py-3 font-semibold">Host</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Since</th>
                <th className="px-3 py-3 text-right font-semibold">Proposed</th>
                <th className="px-3 py-3 text-right font-semibold">Created</th>
                <th className="px-3 py-3 text-right font-semibold">Completed</th>
                <th className="px-3 py-3 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.id} className="border-b border-line/60 last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <p className="font-medium text-fg">{h.full_name || "—"}</p>
                    <p className="text-xs text-muted">{h.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-ink-2 px-2 py-0.5 text-xs capitalize text-muted">{h.host_status}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">{shortDate(h.created_at)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted">{h.proposed}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted">{h.created}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted">{h.completed}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-green-600">{inr(h.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
