import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KpiCard, Card, SectionHeading, EmptyState } from "@/components/os/ui";
import { DashboardFilters } from "@/components/os/DashboardFilters";
import {
  inrCompact,
  inr,
  num,
  pct,
  STATUS_META,
  type DashboardSummary,
  type BosStatus,
} from "@/lib/bos";

export const metadata = { title: "Executive Dashboard · Business OS" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const isoYearStart = () => `${new Date().getFullYear()}-01-01`;
const isoToday = () => new Date().toISOString().slice(0, 10);
const s = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function ExecutiveDashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const from = s(sp.from) || isoYearStart();
  const to = s(sp.to) || isoToday();
  const preset = s(sp.preset) || "year";
  const owner = s(sp.owner);
  const workstream = s(sp.workstream);

  const supabase = await createClient();
  const [{ data, error }, { data: owners }, { data: workstreams }] = await Promise.all([
    supabase.rpc("bos_dashboard_summary", {
      p_from: from,
      p_to: to,
      p_owner: owner || null,
      p_workstream: workstream || null,
    }),
    supabase.from("users").select("id,full_name,email").in("primary_role", ["admin", "employee", "event_host"]).order("full_name"),
    supabase.from("workstreams").select("id,name").order("sort_order"),
  ]);

  const filterProps = {
    from, to, preset, owner, workstream,
    owners: (owners as { id: string; full_name: string | null; email: string | null }[]) ?? [],
    workstreams: (workstreams as { id: string; name: string }[]) ?? [],
  };

  if (error) {
    return (
      <>
        <Header {...filterProps} />
        <EmptyState
          title="Dashboard couldn't load"
          hint={error.message.includes("bos_dashboard_summary")
            ? "Run migrations 0007–0010 in Supabase, then reload."
            : error.message}
        />
      </>
    );
  }

  const d = (data ?? {}) as DashboardSummary;
  const netCash = (d.revenue_actual ?? 0) - (d.expenses_total ?? 0);
  const revVariance = (d.revenue_actual ?? 0) - (d.revenue_target ?? 0);
  const hasTarget = (d.revenue_target ?? 0) > 0;
  const eventProfit = (d.event_revenue ?? 0) - (d.event_cost ?? 0);

  const FIN = "/admin/os/finance";
  const T = "/admin/os/tasks";

  return (
    <>
      <Header {...filterProps} />

      {/* ── Top-line KPIs ── */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Actual revenue" value={inrCompact(d.revenue_actual)} href={FIN} sub={inr(d.revenue_actual)} tone="good" />
        <KpiCard label="Revenue target" value={hasTarget ? inrCompact(d.revenue_target) : "No target yet"} href="/admin/os/roadmap" hint="Roadmap KPIs" />
        <KpiCard label="Revenue variance" value={hasTarget ? inrCompact(revVariance) : "—"} tone={revVariance >= 0 ? "good" : "bad"} href={FIN} />
        <KpiCard label="Total expenses" value={inrCompact(d.expenses_total)} href={FIN} sub={inr(d.expenses_total)} tone="warn" />
        <KpiCard label="Net cash movement" value={inrCompact(netCash)} tone={netCash >= 0 ? "good" : "bad"} href={FIN} />
        <KpiCard label="Total members" value={num(d.members_total)} href="/admin/os/membership" />
        <KpiCard label="Upcoming events" value={num(d.events_upcoming)} href="/admin/os/events" />
        <KpiCard label="Open tasks" value={num(d.tasks_open)} href={T} tone={d.tasks_overdue > 0 ? "warn" : "default"} />
      </div>

      {/* ── A. Business health ── */}
      <SectionHeading title="Business health" desc="Money in, money out, forecast and runway" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <KpiCard label="Revenue" value={inrCompact(d.revenue_actual)} href={FIN} tone="good" />
        <KpiCard label="Expenses" value={inrCompact(d.expenses_total)} href={FIN} tone="warn" />
        <KpiCard label="Profit / Loss" value={inrCompact(netCash)} tone={netCash >= 0 ? "good" : "bad"} href={FIN} />
        <KpiCard label="Forecast revenue" value={inrCompact(d.revenue_forecast)} href={FIN} hint="Base plan" />
        <KpiCard label="Monthly burn" value={inrCompact(d.monthly_burn)} href={FIN} tone="warn" />
        <KpiCard label="Runway" value={d.runway_months != null ? `${d.runway_months} mo` : "No burn"} href={FIN} tone={d.runway_months != null && d.runway_months < 3 ? "bad" : "default"} />
      </div>

      {/* ── B. Application ── */}
      <SectionHeading title="Application" desc="Product development progress" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Dev progress" value={`${d.app_progress ?? 0}%`} href="/admin/os/product" tone="brand" />
        <KpiCard label="Completed modules" value={num(d.app_completed)} href="/admin/os/product" tone="good" />
        <KpiCard label="Pending modules" value={num(d.app_pending)} href="/admin/os/product" />
        <KpiCard label="Blocked modules" value={num(d.app_blocked)} href="/admin/os/product" tone={d.app_blocked ? "bad" : "default"} />
        <KpiCard label="Open bugs" value={num(d.app_bugs)} href="/admin/os/product" tone={d.app_bugs ? "warn" : "default"} />
        <KpiCard label="Total modules" value={num(d.app_total)} href="/admin/os/product" />
      </div>

      {/* ── E/F. Growth ── */}
      <SectionHeading title="Growth" desc="Members and community" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="Members" value={num(d.members_total)} href="/admin/os/membership" />
        <KpiCard label="Free" value={num(d.members_free)} href="/admin/os/membership" />
        <KpiCard label="Paid" value={num(d.members_paid)} href="/admin/os/membership" />
        <KpiCard label="Elite" value={num(d.members_elite)} href="/admin/os/membership" />
        <KpiCard label="Conversion" value={pct(d.member_conversion)} href="/admin/os/membership" />
        <KpiCard label="Influencers" value={num(d.influencers)} href="/admin/os/influencers" />
        <KpiCard label="Ambassadors" value={num(d.ambassadors)} href="/admin/os/ambassadors" />
        <KpiCard label="Partners" value={num(d.partners)} href="/admin/os/partnerships" />
      </div>

      {/* ── C. Marketing ── */}
      <SectionHeading title="Marketing" desc="Reach, leads and spend across campaigns" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Content published" value={num(d.content_published)} href="/admin/os/content" />
        <KpiCard label="Reach" value={num(d.mkt_reach)} href="/admin/os/campaigns" />
        <KpiCard label="Leads" value={num(d.mkt_leads)} href="/admin/os/campaigns" />
        <KpiCard label="Conversions" value={num(d.mkt_conversions)} href="/admin/os/campaigns" />
        <KpiCard label="Marketing spend" value={inrCompact(d.mkt_spend)} href="/admin/os/campaigns" tone="warn" />
        <KpiCard label="Marketing ROI" value={d.mkt_spend > 0 ? `${(((d.mkt_revenue - d.mkt_spend) / d.mkt_spend) * 100).toFixed(0)}%` : "No data yet"} tone={d.mkt_revenue >= d.mkt_spend ? "good" : "bad"} href="/admin/os/analytics" />
      </div>

      {/* ── D. Events ── */}
      <SectionHeading title="Events" desc="From the live events system + BOS financials" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <KpiCard label="Upcoming" value={num(d.events_upcoming)} href="/admin/os/events" />
        <KpiCard label="Completed" value={num(d.events_completed)} href="/admin/os/events" />
        <KpiCard label="Registrations" value={num(d.events_registrations)} href="/admin/os/events" tone="brand" />
        <KpiCard label="Attendance" value={num(d.events_attendance)} href="/admin/os/events" />
        <KpiCard label="Event revenue" value={inrCompact(d.event_revenue)} href="/admin/os/events" tone="good" />
        <KpiCard label="Event cost" value={inrCompact(d.event_cost)} href="/admin/os/events" tone="warn" />
        <KpiCard label="Event profit" value={inrCompact(eventProfit)} href="/admin/os/events" tone={eventProfit >= 0 ? "good" : "bad"} />
      </div>

      {/* ── G. Sales ── */}
      <SectionHeading title="Sales pipeline" desc="Weighted = expected revenue × probability" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="Leads" value={num(d.leads_total)} href="/admin/os/crm" />
        <KpiCard label="Qualified" value={num(d.leads_qualified)} href="/admin/os/crm" />
        <KpiCard label="Proposals" value={num(d.leads_proposal)} href="/admin/os/crm" />
        <KpiCard label="Negotiations" value={num(d.leads_negotiation)} href="/admin/os/crm" />
        <KpiCard label="Pipeline" value={inrCompact(d.pipeline_value)} href="/admin/os/crm" />
        <KpiCard label="Weighted" value={inrCompact(d.weighted_pipeline)} href="/admin/os/crm" tone="brand" />
        <KpiCard label="Won" value={num(d.deals_won)} href="/admin/os/crm" tone="good" />
        <KpiCard label="Lost" value={num(d.deals_lost)} href="/admin/os/crm" tone="bad" />
      </div>

      {/* ── H. People ── */}
      <SectionHeading title="People" desc="Team, hiring and KPI achievement" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Employees" value={num(d.employees)} href="/admin/os/people" />
        <KpiCard label="Open positions" value={num(d.open_positions)} href="/admin/os/hiring" />
        <KpiCard label="Planned hires" value={num(d.planned_hires)} href="/admin/os/hiring" />
        <KpiCard label="Monthly payroll" value={inrCompact(d.monthly_payroll)} href="/admin/os/people" tone="warn" />
        <KpiCard label="Hiring cost" value={inrCompact(d.hiring_cost)} href="/admin/os/hiring" />
        <KpiCard label="KPI achievement" value={`${d.emp_kpi_achievement ?? 0}%`} href="/admin/os/empkpis" tone={(d.emp_kpi_achievement ?? 0) >= 100 ? "good" : "default"} />
      </div>

      {/* ── I. Control center ── */}
      <SectionHeading title="Control center" desc="What needs attention right now" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="Overdue tasks" value={num(d.tasks_overdue)} href={`${T}?view=overdue`} tone={d.tasks_overdue > 0 ? "bad" : "good"} />
        <KpiCard label="Critical tasks" value={num(d.tasks_critical)} href={T} tone={d.tasks_critical > 0 ? "bad" : "default"} />
        <KpiCard label="Blocked" value={num(d.tasks_blocked)} href={`${T}?view=blocked`} tone={d.tasks_blocked > 0 ? "bad" : "default"} />
        <KpiCard label="Open risks" value={num(d.risks_open)} href="/admin/os/risks" tone={d.risks_critical > 0 ? "warn" : "default"} />
        <KpiCard label="Pending approvals" value={num(d.approvals_pending)} href="/admin/os/approvals" tone={d.approvals_pending > 0 ? "warn" : "default"} />
        <KpiCard label="Expiring contracts" value={num(d.contracts_expiring)} href="/admin/os/alerts" tone={d.contracts_expiring > 0 ? "warn" : "default"} />
        <KpiCard label="Dependencies" value={num(d.deps_open)} href="/admin/os/dependencies" />
        <KpiCard label="Deadlines" value={num(d.tasks_due_today)} href="/admin/os/alerts" tone={d.tasks_due_today > 0 ? "warn" : "default"} />
      </div>

      {/* ── Roadmap snapshot ── */}
      <SectionHeading title="90-day roadmap" desc="Goal status across the plan" />
      <RoadmapSnapshot goals={d.goals ?? {}} />
    </>
  );
}

type HeaderProps = React.ComponentProps<typeof DashboardFilters>;

function Header(props: HeaderProps) {
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Executive Dashboard</h1>
        <p className="text-xs text-muted">Techxfluence Business OS</p>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Where the business is now — money, growth, product, events, sales, people and what needs
        attention. Every number links to its records.
      </p>
      <DashboardFilters {...props} />
    </div>
  );
}

function RoadmapSnapshot({ goals }: { goals: Partial<Record<BosStatus, number>> }) {
  const total = Object.values(goals).reduce((a, b) => a + (b ?? 0), 0);
  if (total === 0) {
    return (
      <EmptyState
        title="No roadmap goals yet"
        hint="Add your first 90-day goals to see progress here."
        action={<Link href="/admin/os/roadmap" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white">Open roadmap</Link>}
      />
    );
  }
  const order: BosStatus[] = ["completed", "in_progress", "not_started", "blocked", "on_hold", "cancelled"];
  return (
    <Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {order.map((st) => (
          <Link key={st} href="/admin/os/roadmap" className="group">
            <p className="font-display text-2xl font-bold tabular-nums text-fg">{goals[st] ?? 0}</p>
            <p className="mt-0.5 text-xs text-muted group-hover:text-fg">{STATUS_META[st].label}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
