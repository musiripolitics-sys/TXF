import { createClient } from "@/lib/supabase/server";
import { BarList, type BarDatum } from "@/components/os/BarList";
import { SectionHeading } from "@/components/os/ui";
import { inrCompact } from "@/lib/bos";

export const metadata = { title: "Analytics · Business OS" };

const top = (arr: BarDatum[], n = 8) =>
  arr.filter((d) => d.value > 0).sort((a, b) => b.value - a.value).slice(0, n);

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [
    { data: campaigns },
    { data: leads },
    { data: influencers },
    { data: ambassadors },
    { data: payments },
    { data: events },
    { data: empKpis },
    { data: content },
    { data: users },
  ] = await Promise.all([
    supabase.from("campaigns").select("name,channel,actual_leads,actual_spend,revenue_generated,actual_conversions"),
    supabase.from("leads").select("stage,source,expected_revenue,weighted_revenue"),
    supabase.from("influencers").select("name,conversions,members_generated"),
    supabase.from("ambassadors").select("student_name,college,members_acquired"),
    supabase.from("payments").select("amount,related_id,related_type,status").eq("status", "paid"),
    supabase.from("events").select("id,title"),
    supabase.from("employee_kpis").select("employee_id,kpi_name,target,actual"),
    supabase.from("content_items").select("platform,leads,reach"),
    supabase.from("users").select("id,full_name"),
  ]);

  const C = campaigns ?? [];
  const L = leads ?? [];

  // Leads by channel
  const byChannel = new Map<string, number>();
  for (const c of C) if (c.channel) byChannel.set(c.channel, (byChannel.get(c.channel) ?? 0) + (c.actual_leads ?? 0));
  const leadsByChannel = top([...byChannel].map(([label, value]) => ({ label, value })));

  // Campaign ROI
  const roi: BarDatum[] = top(
    C.filter((c) => (c.actual_spend ?? 0) > 0).map((c) => {
      const r = (((c.revenue_generated ?? 0) - (c.actual_spend ?? 0)) / (c.actual_spend as number)) * 100;
      return { label: c.name, value: Math.round(r), display: `${Math.round(r)}%` };
    }),
  );

  // Event revenue (from payments joined to events)
  const evTitle = new Map((events ?? []).map((e) => [e.id, e.title]));
  const evRev = new Map<string, number>();
  for (const p of payments ?? []) {
    if (p.related_type === "events" && p.related_id) evRev.set(p.related_id, (evRev.get(p.related_id) ?? 0) + (p.amount ?? 0));
  }
  const eventRevenue = top(
    [...evRev].map(([id, value]) => ({ label: evTitle.get(id) ?? "Event", value, display: inrCompact(value) })),
  );

  // Pipeline by stage
  const byStage = new Map<string, number>();
  for (const l of L) byStage.set(l.stage, (byStage.get(l.stage) ?? 0) + (l.expected_revenue ?? 0));
  const pipelineByStage = [...byStage].map(([label, value]) => ({ label, value, display: inrCompact(value) }));

  // Leads by source
  const bySource = new Map<string, number>();
  for (const l of L) if (l.source) bySource.set(l.source, (bySource.get(l.source) ?? 0) + 1);
  const leadsBySource = top([...bySource].map(([label, value]) => ({ label, value })));

  // Influencer conversions
  const inflConv = top((influencers ?? []).map((i) => ({ label: i.name, value: i.conversions ?? 0 })));

  // Ambassador members acquired
  const ambMembers = top(
    (ambassadors ?? []).map((a) => ({ label: `${a.student_name} · ${a.college ?? ""}`.trim(), value: a.members_acquired ?? 0 })),
  );

  // Content leads by platform
  const cByPlat = new Map<string, number>();
  for (const c of content ?? []) if (c.platform) cByPlat.set(c.platform, (cByPlat.get(c.platform) ?? 0) + (c.leads ?? 0));
  const contentLeads = top([...cByPlat].map(([label, value]) => ({ label, value })));

  // Employee KPI achievement %
  const uName = new Map((users ?? []).map((u) => [u.id, u.full_name]));
  const empByUser = new Map<string, { t: number; a: number }>();
  for (const k of empKpis ?? []) {
    const cur = empByUser.get(k.employee_id) ?? { t: 0, a: 0 };
    cur.t += Number(k.target ?? 0);
    cur.a += Number(k.actual ?? 0);
    empByUser.set(k.employee_id, cur);
  }
  const empAchievement = top(
    [...empByUser].map(([id, { t, a }]) => ({
      label: uName.get(id) ?? "Employee",
      value: t > 0 ? Math.round((a / t) * 100) : 0,
      display: t > 0 ? `${Math.round((a / t) * 100)}%` : "—",
    })),
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Business Intelligence</h1>
        <p className="text-sm text-muted">
          Which channels, campaigns, events and people are driving results — from live data only.
        </p>
      </div>

      <SectionHeading title="Marketing & acquisition" />
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BarList title="Leads by channel" desc="Which channel generates the most leads" data={leadsByChannel} emptyHint="Add campaigns with actual leads." />
        <BarList title="Campaign ROI" desc="(Revenue − spend) ÷ spend" data={roi} color="#10b981" emptyHint="Log campaign spend and revenue." />
        <BarList title="Content leads by platform" data={contentLeads} color="#8b5cf6" emptyHint="Log content leads." />
        <BarList title="Leads by source" data={leadsBySource} color="#ec4899" emptyHint="Add CRM leads with a source." />
        <BarList title="Influencer conversions" data={inflConv} color="#f59e0b" emptyHint="Track influencer conversions." />
        <BarList title="Ambassador members acquired" data={ambMembers} color="#06b6d4" emptyHint="Track ambassador results." />
      </div>

      <SectionHeading title="Revenue & pipeline" />
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BarList title="Event revenue" desc="Which events generate the most revenue" data={eventRevenue} color="#22c55e" emptyHint="Revenue appears as tickets sell." />
        <BarList title="Pipeline by stage" desc="Expected revenue by stage" data={pipelineByStage} color="#ef4444" emptyHint="Add CRM leads." />
      </div>

      <SectionHeading title="People" desc="Objective KPI achievement — no rankings, just progress" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BarList title="KPI achievement" desc="Actual ÷ target" data={empAchievement} color="#a855f7" emptyHint="Add employee KPI targets and actuals." />
      </div>
    </>
  );
}
