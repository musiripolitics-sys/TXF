import { createClient } from "@/lib/supabase/server";
import { ReportsClient, type Report } from "./ReportsClient";
import { paiseToRupees } from "@/lib/bos";

export const metadata = { title: "Reports · Business OS" };

const d = (s: string | null | undefined) => (s ? String(s).slice(0, 10) : "");
const r = (paise: number | null | undefined) => paiseToRupees(Number(paise ?? 0));

export default async function ReportsPage() {
  const supabase = await createClient();

  const [
    { data: expenses },
    { data: revenue },
    { data: campaigns },
    { data: events },
    { data: leads },
    { data: tasks },
    { data: users },
  ] = await Promise.all([
    supabase.from("expenses").select("spent_on,category,subcategory,description,vendor,amount,payment_status"),
    supabase.from("revenue_entries").select("received_on,source,description,amount"),
    supabase.from("campaigns").select("name,channel,campaign_type,budget,actual_spend,actual_leads,actual_conversions,revenue_generated,status"),
    supabase.from("events").select("title,category,date,city,status,capacity,spots_left"),
    supabase.from("leads").select("name,company,source,stage,expected_revenue,probability,weighted_revenue"),
    supabase.from("tasks").select("title,owner_id,frequency,due_date,status,priority,budget,actual_cost"),
    supabase.from("users").select("id,full_name"),
  ]);

  const uName = new Map((users ?? []).map((u) => [u.id, u.full_name]));

  const reports: Report[] = [
    {
      key: "finance",
      title: "Finance",
      columns: ["Date", "Type", "Category", "Description", "Vendor", "Amount (₹)", "Status"],
      rows: [
        ...(expenses ?? []).map((e) => [d(e.spent_on), "Expense", `${e.category}${e.subcategory ? " / " + e.subcategory : ""}`, e.description ?? "", e.vendor ?? "", -r(e.amount), e.payment_status]),
        ...(revenue ?? []).map((x) => [d(x.received_on), "Revenue", x.source, x.description ?? "", "", r(x.amount), "received"]),
      ],
    },
    {
      key: "marketing",
      title: "Marketing",
      columns: ["Campaign", "Channel", "Type", "Budget (₹)", "Spend (₹)", "Leads", "Conversions", "Revenue (₹)", "Status"],
      rows: (campaigns ?? []).map((c) => [c.name, c.channel ?? "", c.campaign_type ?? "", r(c.budget), r(c.actual_spend), c.actual_leads ?? 0, c.actual_conversions ?? 0, r(c.revenue_generated), c.status]),
    },
    {
      key: "events",
      title: "Events",
      columns: ["Event", "Category", "Date", "City", "Status", "Capacity", "Spots left"],
      rows: (events ?? []).map((e) => [e.title, e.category, d(e.date), e.city, e.status, e.capacity, e.spots_left]),
    },
    {
      key: "sales",
      title: "Sales / CRM",
      columns: ["Lead", "Company", "Source", "Stage", "Expected (₹)", "Probability %", "Weighted (₹)"],
      rows: (leads ?? []).map((l) => [l.name, l.company ?? "", l.source ?? "", l.stage, r(l.expected_revenue), l.probability ?? 0, r(l.weighted_revenue)]),
    },
    {
      key: "tasks",
      title: "Tasks",
      columns: ["Task", "Owner", "Frequency", "Due", "Status", "Priority", "Budget (₹)", "Actual (₹)"],
      rows: (tasks ?? []).map((t) => [t.title, uName.get(t.owner_id ?? "") ?? "", t.frequency, d(t.due_date), t.status, t.priority, r(t.budget), r(t.actual_cost)]),
    },
  ];

  return <ReportsClient reports={reports} />;
}
