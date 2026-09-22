import { createClient } from "@/lib/supabase/server";
import { ReviewsClient, type ReviewMetrics, type ReviewNotes } from "./ReviewsClient";

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

export default async function ReviewsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
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
    <ReviewsClient
      type={type}
      start={start}
      end={end}
      metrics={metrics}
      notes={(review as ReviewNotes) ?? null}
    />
  );
}
