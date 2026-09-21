import { createClient } from "@/lib/supabase/server";
import { KpiCard, Card, SectionHeading, EmptyState } from "@/components/os/ui";
import { DashboardFilters } from "@/components/os/DashboardFilters";
import {
  inrCompact,
  inr,
  num,
  STATUS_META,
  type DashboardSummary,
  type BosStatus,
} from "@/lib/bos";

export const metadata = { title: "Executive Dashboard · Business OS" };

type SP = Promise<Record<string, string | string[] | undefined>>;

function isoYearStart() {
  return `${new Date().getFullYear()}-01-01`;
}
function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ExecutiveDashboard({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const from = (typeof sp.from === "string" && sp.from) || isoYearStart();
  const to = (typeof sp.to === "string" && sp.to) || isoToday();
  const preset = (typeof sp.preset === "string" && sp.preset) || "year";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bos_dashboard_summary", {
    p_from: from,
    p_to: to,
  });

  if (error) {
    return (
      <>
        <Header from={from} to={to} preset={preset} />
        <EmptyState
          title="Dashboard couldn't load"
          hint={
            error.message.includes("bos_dashboard_summary")
              ? "Run migration 0007_business_os.sql in Supabase, then reload."
              : error.message
          }
        />
      </>
    );
  }

  const d = (data ?? {}) as DashboardSummary;
  const netCash = (d.revenue_actual ?? 0) - (d.expenses_total ?? 0);
  const revVariance = (d.revenue_actual ?? 0) - (d.revenue_target ?? 0);
  const hasTarget = (d.revenue_target ?? 0) > 0;

  const FIN = "/admin/os/finance";
  const T = "/admin/os/tasks";

  return (
    <>
      <Header from={from} to={to} preset={preset} />

      {/* ── Top-line KPIs ── */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Actual revenue" value={inrCompact(d.revenue_actual)} href={FIN} sub={inr(d.revenue_actual)} tone="good" />
        <KpiCard
          label="Revenue target"
          value={hasTarget ? inrCompact(d.revenue_target) : "No target yet"}
          href="/admin/os/roadmap"
          hint="Set via roadmap KPIs"
        />
        <KpiCard
          label="Revenue variance"
          value={hasTarget ? inrCompact(revVariance) : "—"}
          tone={revVariance >= 0 ? "good" : "bad"}
          href={FIN}
        />
        <KpiCard label="Total expenses" value={inrCompact(d.expenses_total)} href={FIN} sub={inr(d.expenses_total)} tone="warn" />
        <KpiCard label="Net cash movement" value={inrCompact(netCash)} tone={netCash >= 0 ? "good" : "bad"} href={FIN} />
        <KpiCard label="Cash position" value={inrCompact(d.cash_position)} href={FIN} hint="Latest base forecast" />
        <KpiCard label="Total members" value={num(d.members_total)} href="/admin" />
        <KpiCard label="Open tasks" value={num(d.tasks_open)} href={T} tone={d.tasks_overdue > 0 ? "warn" : "default"} />
      </div>

      {/* ── B. Business health ── */}
      <SectionHeading title="Business health" desc="Money in, money out, what's left" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Revenue" value={inrCompact(d.revenue_actual)} sub={inr(d.revenue_actual)} href={FIN} tone="good" />
        <KpiCard label="Expenses" value={inrCompact(d.expenses_total)} sub={inr(d.expenses_total)} href={FIN} tone="warn" />
        <KpiCard label="Profit / Loss" value={inrCompact(netCash)} tone={netCash >= 0 ? "good" : "bad"} href={FIN} />
        <KpiCard label="Forecast expenses" value={inrCompact(d.expenses_forecast)} href={FIN} hint="Base cash-flow plan" />
      </div>

      {/* ── E/F. Growth ── */}
      <SectionHeading title="Growth" desc="Members and community" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="Members" value={num(d.members_total)} href="/admin" />
        <KpiCard label="Free" value={num(d.members_free)} href="/admin" />
        <KpiCard label="Paid" value={num(d.members_paid)} href="/admin" />
        <KpiCard label="Elite" value={num(d.members_elite)} href="/admin" />
        <KpiCard label="New (range)" value={num(d.members_new)} href="/admin" tone="brand" />
        <KpiCard label="Influencers" value={num(d.influencers)} />
        <KpiCard label="Ambassadors" value={num(d.ambassadors)} />
        <KpiCard label="Partners" value={num(d.partners)} />
      </div>

      {/* ── C. Marketing ── */}
      <SectionHeading title="Marketing" desc="Reach, leads and spend across campaigns" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Content published" value={num(d.content_published)} />
        <KpiCard label="Reach" value={num(d.mkt_reach)} />
        <KpiCard label="Leads" value={num(d.mkt_leads)} />
        <KpiCard label="Conversions" value={num(d.mkt_conversions)} />
        <KpiCard label="Marketing spend" value={inrCompact(d.mkt_spend)} tone="warn" />
        <KpiCard
          label="Marketing ROI"
          value={
            d.mkt_spend > 0
              ? `${(((d.mkt_revenue - d.mkt_spend) / d.mkt_spend) * 100).toFixed(0)}%`
              : "No data yet"
          }
          tone={d.mkt_revenue >= d.mkt_spend ? "good" : "bad"}
          hint="(Revenue − spend) ÷ spend"
        />
      </div>

      {/* ── D. Events ── */}
      <SectionHeading title="Events" desc="From the live events system" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Upcoming events" value={num(d.events_upcoming)} href="/events" />
        <KpiCard label="Completed" value={num(d.events_completed)} href="/events" />
        <KpiCard label="Registrations (range)" value={num(d.events_registrations)} href="/admin" tone="brand" />
        <KpiCard label="Attendance (range)" value={num(d.events_attendance)} href="/admin" />
      </div>

      {/* ── G. Sales ── */}
      <SectionHeading title="Sales pipeline" desc="Weighted = expected revenue × probability" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Leads" value={num(d.leads_total)} />
        <KpiCard label="Pipeline value" value={inrCompact(d.pipeline_value)} />
        <KpiCard label="Weighted pipeline" value={inrCompact(d.weighted_pipeline)} tone="brand" />
        <KpiCard label="Won" value={num(d.deals_won)} tone="good" />
        <KpiCard label="Lost" value={num(d.deals_lost)} tone="bad" />
      </div>

      {/* ── I. Control center ── */}
      <SectionHeading title="Control center" desc="What needs attention right now" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Overdue tasks" value={num(d.tasks_overdue)} href={`${T}?view=overdue`} tone={d.tasks_overdue > 0 ? "bad" : "good"} />
        <KpiCard label="Due today" value={num(d.tasks_due_today)} href={`${T}?view=today`} tone={d.tasks_due_today > 0 ? "warn" : "default"} />
        <KpiCard label="Blocked tasks" value={num(d.tasks_blocked)} href={`${T}?view=blocked`} tone={d.tasks_blocked > 0 ? "bad" : "default"} />
        <KpiCard label="Pending approvals" value={num(d.approvals_pending)} tone={d.approvals_pending > 0 ? "warn" : "default"} />
        <KpiCard label="Open risks" value={num(d.risks_open)} />
        <KpiCard label="Critical risks" value={num(d.risks_critical)} tone={d.risks_critical > 0 ? "bad" : "default"} />
      </div>

      {/* ── Roadmap snapshot ── */}
      <SectionHeading title="90-day roadmap" desc="Goal status across the plan" right={undefined} />
      <RoadmapSnapshot goals={d.goals ?? {}} />
    </>
  );
}

function Header({ from, to, preset }: { from: string; to: string; preset: string }) {
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          Executive Dashboard
        </h1>
        <p className="text-xs text-muted">Techxfluence Business OS</p>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Where the business is now — money, growth, events, sales and what needs
        attention. Every number links to its records.
      </p>
      <DashboardFilters from={from} to={to} preset={preset} />
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
        action={
          <a
            href="/admin/os/roadmap"
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Open roadmap
          </a>
        }
      />
    );
  }
  const order: BosStatus[] = [
    "completed",
    "in_progress",
    "not_started",
    "blocked",
    "on_hold",
    "cancelled",
  ];
  return (
    <Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {order.map((s) => (
          <a key={s} href="/admin/os/roadmap" className="group">
            <p className="font-display text-2xl font-bold tabular-nums text-fg">
              {goals[s] ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-muted group-hover:text-fg">
              {STATUS_META[s].label}
            </p>
          </a>
        ))}
      </div>
    </Card>
  );
}
