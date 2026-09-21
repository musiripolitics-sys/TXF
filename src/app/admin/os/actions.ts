"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";

/**
 * Business OS mutations. Every write re-checks admin (defence in depth on top
 * of RLS), records an audit_log row, and revalidates the module so Server
 * Components repaint with fresh data. Money fields arrive already in paise —
 * the client converts rupees at the form boundary.
 */

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" as const };
  if (!(await isAdmin())) return { error: "Not authorised" as const };
  return { user };
}

async function logAudit(
  supabase: SupabaseServer,
  userId: string,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  await supabase.from("audit_log").insert({
    user_id: userId,
    action,
    entity,
    entity_id: entityId,
    before: before ?? null,
    after: after ?? null,
  });
}

const OS = "/admin/os";
function revalidateOs() {
  revalidatePath(OS);
  revalidatePath(`${OS}/roadmap`);
  revalidatePath(`${OS}/tasks`);
  revalidatePath(`${OS}/finance`);
}

// ─────────────────────────── shared field schemas ───────────────────────────

const statusEnum = z.enum([
  "not_started",
  "in_progress",
  "blocked",
  "completed",
  "on_hold",
  "cancelled",
]);
const priorityEnum = z.enum(["critical", "high", "medium", "low"]);
const freqEnum = z.enum(["daily", "weekly", "monthly", "one_time"]);
const optDate = z.string().optional().nullable().transform((v) => v || null);
const optUuid = z
  .string()
  .uuid()
  .optional()
  .nullable()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

// ─────────────────────────────── Goals ───────────────────────────────

const goalSchema = z.object({
  objective: z.string().trim().min(2, "Objective is required"),
  deliverable: z.string().trim().optional().nullable(),
  workstream_id: optUuid,
  owner_id: optUuid,
  month: z.coerce.number().int().min(1).max(3).optional().nullable(),
  week: z.coerce.number().int().min(1).max(13).optional().nullable(),
  start_date: optDate,
  end_date: optDate,
  priority: priorityEnum.default("medium"),
  status: statusEnum.default("not_started"),
  budget: z.coerce.number().int().min(0).default(0),
  target_kpi: z.string().trim().optional().nullable(),
  actual_kpi: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export async function saveGoal(id: string | null, input: unknown) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  if (id) {
    const { data: before } = await supabase.from("goals").select("*").eq("id", id).maybeSingle();
    const { data, error } = await supabase.from("goals").update(parsed.data).eq("id", id).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit(supabase, gate.user.id, "update", "goals", id, before, data);
  } else {
    const { data, error } = await supabase.from("goals").insert(parsed.data).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit(supabase, gate.user.id, "insert", "goals", data?.id ?? null, null, data);
  }
  revalidateOs();
  return { success: true };
}

export async function deleteGoal(id: string) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const supabase = await createClient();
  const { data: before } = await supabase.from("goals").select("*").eq("id", id).maybeSingle();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, gate.user.id, "delete", "goals", id, before, null);
  revalidateOs();
  return { success: true };
}

// ─────────────────────────────── Tasks ───────────────────────────────

const taskSchema = z.object({
  title: z.string().trim().min(2, "Task title is required"),
  description: z.string().trim().optional().nullable(),
  workstream_id: optUuid,
  goal_id: optUuid,
  owner_id: optUuid,
  frequency: freqEnum.default("one_time"),
  start_date: optDate,
  due_date: optDate,
  status: statusEnum.default("not_started"),
  priority: priorityEnum.default("medium"),
  budget: z.coerce.number().int().min(0).default(0),
  actual_cost: z.coerce.number().int().min(0).default(0),
  target: z.coerce.number().optional().nullable(),
  actual: z.coerce.number().optional().nullable(),
  comments: z.string().trim().optional().nullable(),
});

export async function saveTask(id: string | null, input: unknown) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  if (id) {
    const { data: before } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
    const { data, error } = await supabase.from("tasks").update(parsed.data).eq("id", id).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit(supabase, gate.user.id, "update", "tasks", id, before, data);
  } else {
    const { data, error } = await supabase.from("tasks").insert(parsed.data).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit(supabase, gate.user.id, "insert", "tasks", data?.id ?? null, null, data);
  }
  revalidateOs();
  return { success: true };
}

export async function setTaskStatus(id: string, status: z.infer<typeof statusEnum>) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  if (!statusEnum.safeParse(status).success) return { error: "Invalid status" };
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, gate.user.id, "update", "tasks", id, null, { status });
  revalidateOs();
  return { success: true };
}

export async function deleteTask(id: string) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const supabase = await createClient();
  const { data: before } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, gate.user.id, "delete", "tasks", id, before, null);
  revalidateOs();
  return { success: true };
}

// ─────────────────────────────── Expenses ───────────────────────────────

const expenseSchema = z.object({
  category: z.string().trim().min(1, "Category is required"),
  subcategory: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  amount: z.coerce.number().int().min(0), // paise
  spent_on: z.string().min(1, "Date is required"),
  vendor: z.string().trim().optional().nullable(),
  workstream_id: optUuid,
  approval_status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  payment_status: z.enum(["unpaid", "paid"]).default("unpaid"),
  recurring: z.coerce.boolean().default(false),
});

export async function saveExpense(id: string | null, input: unknown) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const row = { ...parsed.data, owner_id: gate.user.id };
  if (id) {
    const { data: before } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();
    const { data, error } = await supabase.from("expenses").update(parsed.data).eq("id", id).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit(supabase, gate.user.id, "update", "expenses", id, before, data);
  } else {
    const { data, error } = await supabase.from("expenses").insert(row).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit(supabase, gate.user.id, "insert", "expenses", data?.id ?? null, null, data);
  }
  revalidateOs();
  return { success: true };
}

export async function deleteExpense(id: string) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const supabase = await createClient();
  const { data: before } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, gate.user.id, "delete", "expenses", id, before, null);
  revalidateOs();
  return { success: true };
}

// ─────────────────────────────── Revenue ───────────────────────────────

const revenueSchema = z.object({
  source: z.string().trim().min(1, "Source is required"),
  description: z.string().trim().optional().nullable(),
  amount: z.coerce.number().int().min(0), // paise
  received_on: z.string().min(1, "Date is required"),
  related_event_id: optUuid,
  workstream_id: optUuid,
});

export async function saveRevenue(id: string | null, input: unknown) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const parsed = revenueSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  if (id) {
    const { data: before } = await supabase.from("revenue_entries").select("*").eq("id", id).maybeSingle();
    const { data, error } = await supabase.from("revenue_entries").update(parsed.data).eq("id", id).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit(supabase, gate.user.id, "update", "revenue_entries", id, before, data);
  } else {
    const { data, error } = await supabase.from("revenue_entries").insert(parsed.data).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit(supabase, gate.user.id, "insert", "revenue_entries", data?.id ?? null, null, data);
  }
  revalidateOs();
  return { success: true };
}

export async function deleteRevenue(id: string) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const supabase = await createClient();
  const { data: before } = await supabase.from("revenue_entries").select("*").eq("id", id).maybeSingle();
  const { error } = await supabase.from("revenue_entries").delete().eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, gate.user.id, "delete", "revenue_entries", id, before, null);
  revalidateOs();
  return { success: true };
}

// ─────────────────────────────── Cash flow ───────────────────────────────

const cashflowSchema = z.object({
  month: z.string().min(1, "Month is required"),
  scenario: z.enum(["base", "conservative", "growth"]).default("base"),
  opening_cash: z.coerce.number().int().default(0),
  revenue_forecast: z.coerce.number().int().default(0),
  marketing_spend: z.coerce.number().int().default(0),
  event_cost: z.coerce.number().int().default(0),
  payroll: z.coerce.number().int().default(0),
  hiring_cost: z.coerce.number().int().default(0),
  technology_cost: z.coerce.number().int().default(0),
  other_expenses: z.coerce.number().int().default(0),
});

export async function saveCashflow(input: unknown) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const parsed = cashflowSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  // Upsert on (month, scenario) — the table's unique constraint.
  const { data, error } = await supabase
    .from("cashflow_months")
    .upsert(parsed.data, { onConflict: "month,scenario" })
    .select()
    .maybeSingle();
  if (error) return { error: error.message };
  await logAudit(supabase, gate.user.id, "upsert", "cashflow_months", data?.id ?? null, null, data);
  revalidateOs();
  return { success: true };
}
