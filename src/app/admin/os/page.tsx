import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KpiCard, Panel, PanelStat, Meter, EmptyState } from "@/components/os/ui";
import { DashboardFilters } from "@/components/os/DashboardFilters";
import { AttentionBand, type AttentionItem } from "@/components/os/AttentionBand";
import { SectionStatusGrid } from "@/components/os/SectionStatusGrid";
import { emptySections, totalOverdue, type SectionStatus } from "@/lib/bos-sections";
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

/** Whole days between a past date and today. Never negative. */
function daysLate(date: string | null): number | null {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  return diff <= 0 ? null : Math.floor(diff / 86_400_000);
}

const OPEN_STATUSES = "(completed,cancelled)";

export default async function ExecutiveDashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const from = s(sp.from) || isoYearStart();
  const to = s(sp.to) || isoToday();
  const preset = s(sp.preset) || "year";
  const owner = s(sp.owner);
  const workstream = s(sp.workstream);

  const supabase = await createClient();
  const today = isoToday();

  const [
    { data, error },
    { data: owners },
    { data: workstreams },
    sectionRes,
    lateTasksRes,
    lateGoalsRes,
    approvalsRes,
    reviewsRes,
  ] = await Promise.all([
    supabase.rpc("bos_dashboard_summary", {
      p_from: from,
      p_to: to,
      p_owner: owner || null,
      p_workstream: workstream || null,
    }),
    supabase.from("users").select("id,full_name,email").in("primary_role", ["admin", "employee", "event_host"]).order("full_name"),
    supabase.from("workstreams").select("id,name").order("sort_order"),
    // Added by migration 0011 — absent on a database that hasn't run it yet,
    // so every consumer below treats an error as "no data", not a crash.
    supabase.rpc("bos_section_status"),
    supabase
      .from("tasks")
      .select("id,title,due_date,owner_id")
      .lt("due_date", today)
      .not("status", "in", OPEN_STATUSES)
      .order("due_date", { ascending: true })
      .limit(8),
    supabase
      .from("goals")
      .select("id,objective,deliverable,end_date,owner_id")
      .lt("end_date", today)
      .not("status", "in", OPEN_STATUSES)
      .order("end_date", { ascending: true })
      .limit(5),
    supabase
      .from("approvals")
      .select("id,request_title,created_at")
      .eq("decision", "pending")
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("task_reviews")
      .select("task_id,created_at,tasks(title)")
      .eq("outcome", "pending")
      .order("created_at", { ascending: true })
      .limit(5),
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

  const ownerName = new Map(
    ((owners as { id: string; full_name: string | null; email: string | null }[]) ?? []).map(
      (o) => [o.id, o.full_name || o.email || null] as const,
    ),
  );

  const sections = (sectionRes.error ? null : (sectionRes.data as SectionStatus)) ?? null;

  const attention: AttentionItem[] = [
    ...((lateTasksRes.data as { id: string; title: string; due_date: string; owner_id: string | null }[]) ?? []).map(
      (t): AttentionItem => ({
        id: t.id,
        kind: "Task",
        title: t.title,
        href: `/admin/os/tasks?view=overdue`,
        daysLate: daysLate(t.due_date),
        owner: t.owner_id ? ownerName.get(t.owner_id) : null,
      }),
    ),
    ...((lateGoalsRes.data as { id: string; objective: string | null; deliverable: string | null; end_date: string; owner_id: string | null }[]) ?? []).map(
      (g): AttentionItem => ({
        id: g.id,
        kind: "Goal",
        title: g.deliverable?.trim() || g.objective || "Untitled goal",
        href: "/admin/os/roadmap",
        daysLate: daysLate(g.end_date),
        owner: g.owner_id ? ownerName.get(g.owner_id) : null,
      }),
    ),
    ...((approvalsRes.data as { id: string; request_title: string | null; created_at: string }[]) ?? []).map(
      (a): AttentionItem => ({
        id: a.id,
        kind: "Approval",
        title: a.request_title || "Untitled request",
        href: "/admin/os/approvals",
        daysLate: null,
        note: "Pending",
      }),
    ),
    // PostgREST types an embedded relation as an array even when the foreign
    // key makes it at most one row, so the task comes back as tasks[0].
    ...((reviewsRes.data as { task_id: string; tasks: { title: string }[] | null }[] | null) ?? []).map(
      (r): AttentionItem => {
        const taskTitle = r.tasks?.[0]?.title;
        return {
        id: r.task_id,
        kind: "Review",
        title: taskTitle ? `Review "${taskTitle}"` : "Review a completed task",
        href: "/admin/os/reviews?tab=tasks",
        daysLate: null,
        note: "Unwritten",
        };
      },
    ),
  ]
    // Worst first: anything with a day count outranks anything merely waiting.
    .sort((a, b) => (b.daysLate ?? -1) - (a.daysLate ?? -1))
    .slice(0, 10);

  const d = (data ?? {}) as DashboardSummary;
  const netCash = (d.revenue_actual ?? 0) - (d.expenses_total ?? 0);
  const hasTarget = (d.revenue_target ?? 0) > 0;
  const eventProfit = (d.event_revenue ?? 0) - (d.event_cost ?? 0);

  const FIN = "/admin/os/finance";
  const T = "/admin/os/tasks";

  return (
    <>
      <Header {...filterProps} />

      {/* ── What is late, by name. The dashboard's main job. ── */}
      <AttentionBand items={attention} />

      {/* ── Every section of the OS and where it stands ── */}
      <Panel
        icon="home"
        title="All sections"
        desc={
          sections
            ? `${totalOverdue(sections)} overdue across the OS · ${emptySections(sections).length} sections not started yet`
            : "Current state of every part of the Business OS"
        }
        className="mb-4"
      >
        {sections ? (
          <SectionStatusGrid status={sections} />
        ) : (
          <EmptyState
            title="Section status needs migration 0011"
            hint="Run supabase/migrations/0011_business_os_chain.sql, then reload to see every section's live state here."
          />
        )}
      </Panel>

      {/* ── Headline ── */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Actual revenue" value={inrCompact(d.revenue_actual)} href={FIN} sub={inr(d.revenue_actual)} tone="good" />
        <KpiCard label="Net cash movement" value={inrCompact(netCash)} href={FIN} tone={netCash >= 0 ? "good" : "bad"} />
        <KpiCard label="Total members" value={num(d.members_total)} href="/admin/os/membership" sub={`${num(d.members_new)} new in range`} />
        <KpiCard
          label="Needs attention"
          value={num(d.tasks_overdue + d.risks_critical + d.approvals_pending)}
          href="/admin/os/alerts"
          tone={d.tasks_overdue || d.risks_critical || d.approvals_pending ? "warn" : "good"}
          sub="Overdue tasks + critical risks + approvals"
        />
      </div>

      {/* ── Grouped panels — same data as before, organised by topic ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon="trophy" title="Business health" desc="Money in, money out, forecast and runway">
          <div className="grid grid-cols-3 gap-1">
            <PanelStat label="Revenue" value={inrCompact(d.revenue_actual)} tone="good" href={FIN} />
            <PanelStat label="Expenses" value={inrCompact(d.expenses_total)} tone="warn" href={FIN} />
            <PanelStat label="Profit / loss" value={inrCompact(netCash)} tone={netCash >= 0 ? "good" : "bad"} href={FIN} />
            <PanelStat label="Forecast" value={inrCompact(d.revenue_forecast)} href={FIN} />
            <PanelStat label="Monthly burn" value={inrCompact(d.monthly_burn)} tone="warn" href={FIN} />
            <PanelStat
              label="Runway"
              value={d.runway_months != null ? `${d.runway_months} mo` : "No burn"}
              tone={d.runway_months != null && d.runway_months < 3 ? "bad" : "default"}
              href={FIN}
            />
          </div>
          {hasTarget && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[11px] text-muted">
                <span>Revenue vs target</span>
                <span className="tabular-nums">{inrCompact(d.revenue_actual)} / {inrCompact(d.revenue_target)}</span>
              </div>
              <Meter actual={d.revenue_actual} target={d.revenue_target} />
            </div>
          )}
        </Panel>

        <Panel icon="code" title="Application" desc="Product development progress" tone="brand">
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-[11px] text-muted">
              <span>Dev progress</span>
              <span className="tabular-nums">{d.app_progress ?? 0}%</span>
            </div>
            <Meter actual={d.app_progress ?? 0} target={100} />
          </div>
          <div className="grid grid-cols-4 gap-1">
            <PanelStat label="Completed" value={num(d.app_completed)} tone="good" href="/admin/os/product" />
            <PanelStat label="Pending" value={num(d.app_pending)} href="/admin/os/product" />
            <PanelStat label="Blocked" value={num(d.app_blocked)} tone={d.app_blocked ? "bad" : "default"} href="/admin/os/product" />
            <PanelStat label="Open bugs" value={num(d.app_bugs)} tone={d.app_bugs ? "warn" : "default"} href="/admin/os/product" />
          </div>
        </Panel>

        <Panel icon="users" title="Growth & community" desc="Members, influencers, ambassadors, partners">
          <div className="grid grid-cols-4 gap-1">
            <PanelStat label="Members" value={num(d.members_total)} href="/admin/os/membership" />
            <PanelStat label="Free" value={num(d.members_free)} href="/admin/os/membership" />
            <PanelStat label="Paid" value={num(d.members_paid)} href="/admin/os/membership" />
            <PanelStat label="Elite" value={num(d.members_elite)} href="/admin/os/membership" />
            <PanelStat label="Influencers" value={num(d.influencers)} href="/admin/os/influencers" />
            <PanelStat label="Ambassadors" value={num(d.ambassadors)} href="/admin/os/ambassadors" />
            <PanelStat label="Partners" value={num(d.partners)} href="/admin/os/partnerships" />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px] text-muted">
              <span>Conversion to paid</span>
              <span className="tabular-nums">{pct(d.member_conversion)}</span>
            </div>
            <Meter actual={d.member_conversion ?? 0} target={100} />
          </div>
        </Panel>

        <Panel icon="broadcast" title="Marketing" desc="Reach, leads and spend across campaigns">
          <div className="grid grid-cols-3 gap-1">
            <PanelStat label="Content published" value={num(d.content_published)} href="/admin/os/content" />
            <PanelStat label="Reach" value={num(d.mkt_reach)} href="/admin/os/campaigns" />
            <PanelStat label="Leads" value={num(d.mkt_leads)} href="/admin/os/campaigns" />
            <PanelStat label="Conversions" value={num(d.mkt_conversions)} href="/admin/os/campaigns" />
            <PanelStat label="Spend" value={inrCompact(d.mkt_spend)} tone="warn" href="/admin/os/campaigns" />
            <PanelStat
              label="ROI"
              value={d.mkt_spend > 0 ? `${(((d.mkt_revenue - d.mkt_spend) / d.mkt_spend) * 100).toFixed(0)}%` : "No data yet"}
              tone={d.mkt_revenue >= d.mkt_spend ? "good" : "bad"}
              href="/admin/os/analytics"
            />
          </div>
        </Panel>

        <Panel icon="calendar" title="Events" desc="Live events system + BOS financials">
          <div className="grid grid-cols-4 gap-1">
            <PanelStat label="Upcoming" value={num(d.events_upcoming)} href="/admin/os/events" />
            <PanelStat label="Completed" value={num(d.events_completed)} href="/admin/os/events" />
            <PanelStat label="Registrations" value={num(d.events_registrations)} tone="brand" href="/admin/os/events" />
            <PanelStat label="Attendance" value={num(d.events_attendance)} href="/admin/os/events" />
            <PanelStat label="Revenue" value={inrCompact(d.event_revenue)} tone="good" href="/admin/os/events" />
            <PanelStat label="Cost" value={inrCompact(d.event_cost)} tone="warn" href="/admin/os/events" />
            <PanelStat label="Profit" value={inrCompact(eventProfit)} tone={eventProfit >= 0 ? "good" : "bad"} href="/admin/os/events" />
          </div>
        </Panel>

        <Panel icon="trophy" title="Sales pipeline" desc="Weighted = expected revenue × probability">
          <div className="grid grid-cols-4 gap-1">
            <PanelStat label="Leads" value={num(d.leads_total)} href="/admin/os/crm" />
            <PanelStat label="Qualified" value={num(d.leads_qualified)} href="/admin/os/crm" />
            <PanelStat label="Proposals" value={num(d.leads_proposal)} href="/admin/os/crm" />
            <PanelStat label="Negotiations" value={num(d.leads_negotiation)} href="/admin/os/crm" />
            <PanelStat label="Pipeline" value={inrCompact(d.pipeline_value)} href="/admin/os/crm" />
            <PanelStat label="Weighted" value={inrCompact(d.weighted_pipeline)} tone="brand" href="/admin/os/crm" />
            <PanelStat label="Won" value={num(d.deals_won)} tone="good" href="/admin/os/crm" />
            <PanelStat label="Lost" value={num(d.deals_lost)} tone="bad" href="/admin/os/crm" />
          </div>
        </Panel>

        <Panel icon="medal" title="People" desc="Team, hiring and KPI achievement">
          <div className="grid grid-cols-3 gap-1">
            <PanelStat label="Employees" value={num(d.employees)} href="/admin/os/people" />
            <PanelStat label="Open positions" value={num(d.open_positions)} href="/admin/os/hiring" />
            <PanelStat label="Planned hires" value={num(d.planned_hires)} href="/admin/os/hiring" />
            <PanelStat label="Monthly payroll" value={inrCompact(d.monthly_payroll)} tone="warn" href="/admin/os/people" />
            <PanelStat label="Hiring cost" value={inrCompact(d.hiring_cost)} href="/admin/os/hiring" />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px] text-muted">
              <span>KPI achievement</span>
              <span className="tabular-nums">{d.emp_kpi_achievement ?? 0}%</span>
            </div>
            <Meter actual={d.emp_kpi_achievement ?? 0} target={100} />
          </div>
        </Panel>

        <Panel icon="bell" title="Control center" desc="What needs attention right now" tone="warn">
          <div className="grid grid-cols-4 gap-1">
            <PanelStat label="Overdue tasks" value={num(d.tasks_overdue)} tone={d.tasks_overdue > 0 ? "bad" : "good"} href={`${T}?view=overdue`} />
            <PanelStat label="Critical tasks" value={num(d.tasks_critical)} tone={d.tasks_critical > 0 ? "bad" : "default"} href={T} />
            <PanelStat label="Blocked" value={num(d.tasks_blocked)} tone={d.tasks_blocked > 0 ? "bad" : "default"} href={`${T}?view=blocked`} />
            <PanelStat label="Open risks" value={num(d.risks_open)} tone={d.risks_critical > 0 ? "warn" : "default"} href="/admin/os/risks" />
            <PanelStat label="Pending approvals" value={num(d.approvals_pending)} tone={d.approvals_pending > 0 ? "warn" : "default"} href="/admin/os/approvals" />
            <PanelStat label="Expiring contracts" value={num(d.contracts_expiring)} tone={d.contracts_expiring > 0 ? "warn" : "default"} href="/admin/os/alerts" />
            <PanelStat label="Dependencies" value={num(d.deps_open)} href="/admin/os/dependencies" />
            <PanelStat label="Due today" value={num(d.tasks_due_today)} tone={d.tasks_due_today > 0 ? "warn" : "default"} href="/admin/os/alerts" />
          </div>
        </Panel>
      </div>

      {/* ── Roadmap snapshot ── */}
      <Panel icon="rocket" title="90-day roadmap" desc="Goal status across the plan" className="mt-4">
        <RoadmapSnapshot goals={d.goals ?? {}} />
      </Panel>
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

/** Bar colour per status, matching `STATUS_META[status].dot`. */
const ROADMAP_BAR: Record<BosStatus, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-500",
  not_started: "bg-slate-300",
  blocked: "bg-red-500",
  on_hold: "bg-amber-500",
  cancelled: "bg-slate-200",
};

function RoadmapSnapshot({ goals }: { goals: Partial<Record<BosStatus, number>> }) {
  const order: BosStatus[] = ["completed", "in_progress", "not_started", "blocked", "on_hold", "cancelled"];
  const total = order.reduce((a, st) => a + (goals[st] ?? 0), 0);
  if (total === 0) {
    return (
      <EmptyState
        title="No roadmap goals yet"
        hint="Add your first 90-day goals to see progress here."
        action={<Link href="/admin/os/roadmap" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white">Open roadmap</Link>}
      />
    );
  }
  return (
    <div>
      <div className="mb-4 flex h-2.5 w-full overflow-hidden rounded-full bg-ink-2">
        {order.map((st) =>
          goals[st] ? (
            <div
              key={st}
              className={ROADMAP_BAR[st]}
              style={{ width: `${((goals[st] ?? 0) / total) * 100}%` }}
              title={`${STATUS_META[st].label}: ${goals[st]}`}
            />
          ) : null,
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {order.map((st) => (
          <Link key={st} href="/admin/os/roadmap" className="group flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-surface-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${ROADMAP_BAR[st]}`} />
            <span className="font-display text-sm font-bold tabular-nums text-fg">{goals[st] ?? 0}</span>
            <span className="truncate text-xs text-muted group-hover:text-fg">{STATUS_META[st].label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
