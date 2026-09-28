import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ReviewsClient, type ReviewMetrics, type ReviewNotes } from "./ReviewsClient";
import { TaskReviewsClient, type TaskReview } from "./TaskReviewsClient";

export const metadata = { title: "Reviews · Business OS" };

type SP = Promise<Record<string, string | string[] | undefined>>;

const iso = (d: Date) => d.toISOString().slice(0, 10);
function mondayOf(date: Date) {
  const x = new Date(date);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return iso(x);
}
function addDays(d: string, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return iso(x);
}
function monthEnd(firstOfMonth: string) {
  const [y, m] = firstOfMonth.split("-").map(Number);
  return iso(new Date(y, m, 0));
}

/** Two kinds of review live here: the period retro, and one per completed task. */
function Tabs({ tab }: { tab: "period" | "tasks" }) {
  const base = "rounded-full px-4 py-1.5 text-sm font-medium transition-colors";
  return (
    <div className="mb-4 flex gap-2">
      <Link
        href="/admin/os/reviews"
        className={tab === "period" ? `${base} bg-brand text-white` : `${base} border border-line text-muted hover:text-fg`}
      >
        Weekly / monthly
      </Link>
      <Link
        href="/admin/os/reviews?tab=tasks"
        className={tab === "tasks" ? `${base} bg-brand text-white` : `${base} border border-line text-muted hover:text-fg`}
      >
        Per task
      </Link>
    </div>
  );
}

export default async function ReviewsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;

  if (sp.tab === "tasks") {
    const supabase = await createClient();
    // task_reviews arrives with migration 0011; an un-migrated database shows
    // the empty state rather than an error.
    const { data } = await supabase
      .from("task_reviews")
      .select("task_id,outcome,estimate_hours,actual_hours,variance_hours,quality,what_worked,what_failed,learning,tasks(title,completed_at)")
      .order("created_at", { ascending: false })
      .limit(200);

    const rows = ((data as TaskReviewRow[] | null) ?? []).map(
      (r): TaskReview => ({
        task_id: r.task_id,
        // PostgREST returns an embedded relation as an array even for a
        // to-one foreign key.
        title: r.tasks?.[0]?.title ?? "Untitled task",
        completed_at: r.tasks?.[0]?.completed_at ?? null,
        outcome: r.outcome,
        estimate_hours: r.estimate_hours,
        actual_hours: r.actual_hours,
        variance_hours: r.variance_hours,
        quality: r.quality,
        what_worked: r.what_worked,
        what_failed: r.what_failed,
        learning: r.learning,
      }),
    );

    return (
      <>
        <div className="mb-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Reviews</h1>
          <p className="text-sm text-muted">
            One review per completed task — estimated hours against what it actually took.
          </p>
        </div>
        <Tabs tab="tasks" />
        <TaskReviewsClient reviews={rows} />
      </>
    );
  }

  const type = (sp.type === "month" ? "month" : "week") as "week" | "month";
  const now = new Date();

  let start: string;
  let end: string;
  if (type === "week") {
    start = typeof sp.start === "string" && sp.start ? sp.start : mondayOf(now);
    end = addDays(start, 6);
  } else {
    const ym = typeof sp.start === "string" && sp.start ? sp.start.slice(0, 7) : iso(now).slice(0, 7);
    start = `${ym}-01`;
    end = monthEnd(start);
  }

  const supabase = await createClient();
  const [{ data: tasks }, { data: expenses }, { data: revenue }, { data: payments }, { data: kpis }, { data: review }] =
    await Promise.all([
      supabase.from("tasks").select("status,due_date,actual_cost").gte("due_date", start).lte("due_date", end),
      supabase.from("expenses").select("amount").gte("spent_on", start).lte("spent_on", end),
      supabase.from("revenue_entries").select("amount").gte("received_on", start).lte("received_on", end),
      supabase.from("payments").select("amount,created_at,status").eq("status", "paid").gte("created_at", start).lte("created_at", `${end}T23:59:59`),
      supabase.from("employee_kpis").select("target,actual").gte("period", start).lte("period", end),
      supabase.from("reviews").select("*").eq("period_type", type).eq("period_start", start).maybeSingle(),
    ]);

  const T = tasks ?? [];
  const today = iso(now);
  const open = (s: string) => s !== "completed" && s !== "cancelled";

  const metrics: ReviewMetrics = {
    planned: T.length,
    completed: T.filter((t) => t.status === "completed").length,
    missed: T.filter((t) => t.due_date && t.due_date < today && open(t.status)).length,
    inProgress: T.filter((t) => t.status === "in_progress").length,
    budgetUsed:
      T.reduce((a, t) => a + (t.actual_cost ?? 0), 0) + (expenses ?? []).reduce((a, e) => a + (e.amount ?? 0), 0),
    revenue:
      (payments ?? []).reduce((a, p) => a + (p.amount ?? 0), 0) + (revenue ?? []).reduce((a, r) => a + (r.amount ?? 0), 0),
    kpiTarget: (kpis ?? []).reduce((a, k) => a + Number(k.target ?? 0), 0),
    kpiActual: (kpis ?? []).reduce((a, k) => a + Number(k.actual ?? 0), 0),
  };

  return (
    <>
      <Tabs tab="period" />
      <ReviewsClient
      type={type}
      start={start}
      end={end}
      metrics={metrics}
      notes={(review as ReviewNotes) ?? null}
      />
    </>
  );
}

type TaskReviewRow = {
  task_id: string;
  outcome: TaskReview["outcome"];
  estimate_hours: number | null;
  actual_hours: number | null;
  variance_hours: number | null;
  quality: number | null;
  what_worked: string | null;
  what_failed: string | null;
  learning: string | null;
  tasks: { title: string; completed_at: string | null }[] | null;
};
