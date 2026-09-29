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
  // Hours of work. The estimate is snapshotted into the task's review when the
  // task completes, which is what makes estimate-vs-actual answerable later.
  estimate_hours: z.coerce.number().min(0).optional().nullable(),
  actual_hours: z.coerce.number().min(0).optional().nullable(),
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

// ─────────────────────── Roadmap → tasks ───────────────────────

/**
 * Turns every roadmap goal into a task. Each roadmap line is a unit of work, so
 * the goal's dates, owner, workstream and dependencies carry across and land on
 * the calendar as scheduled work. Goals that already produced a task are left
 * alone, so this is safe to press repeatedly.
 */
export async function syncRoadmapTasks() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("bos_sync_roadmap_tasks");
  if (error) {
    return {
      error: error.message.includes("bos_sync_roadmap_tasks")
        ? "Run migration 0011 in Supabase first."
        : error.message,
    };
  }

  const created = typeof data === "number" ? data : 0;
  if (created > 0) {
    await logAudit(supabase, gate.user.id, "create", "tasks", null, null, {
      source: "roadmap",
      created,
    });
  }
  revalidateOs();
  return { success: true, created };
}

// ─────────────────────── Task detail panel ───────────────────────

const taskPatchSchema = z.object({
  title: z.string().trim().min(2, "Title is required").optional(),
  description: z.string().trim().nullable().optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  owner_id: optUuid.optional(),
  due_date: optDate.optional(),
  start_date: optDate.optional(),
  estimate_hours: z.coerce.number().min(0).nullable().optional(),
  dependency_id: optUuid.optional(),
});

/**
 * Patch one task from the detail panel. Only the fields sent are written, so
 * changing the status never silently clears a description somebody else just
 * edited in another tab.
 */
export async function patchTask(id: string, input: unknown) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;

  const parsed = taskPatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const patch = parsed.data;
  if (Object.keys(patch).length === 0) return { success: true };

  // A task that depends on itself would sit blocked forever with no way out.
  if (patch.dependency_id && patch.dependency_id === id) {
    return { error: "A task cannot depend on itself." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();

  // Walk the chain to make sure the new blocker does not lead back here.
  if (patch.dependency_id) {
    const { data: all } = await supabase.from("tasks").select("id,dependency_id");
    const by = new Map((all ?? []).map((t) => [t.id as string, t.dependency_id as string | null]));
    by.set(id, patch.dependency_id);
    const seen = new Set<string>();
    let cursor: string | null | undefined = id;
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      cursor = by.get(cursor);
    }
    if (cursor) return { error: "That would create a circular dependency." };
  }

  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) return { error: error.message };

  await logAudit(supabase, gate.user.id, "update", "tasks", id, before, patch);
  revalidateOs();
  return { success: true };
}

/** Add or clear an extra blocker in the dependency graph (beyond the critical path). */
export async function setTaskEdge(taskId: string, blockerId: string, add: boolean) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  if (taskId === blockerId) return { error: "A task cannot depend on itself." };

  const supabase = await createClient();
  const [{ data: from }, { data: to }] = await Promise.all([
    supabase.from("tasks").select("code,title").eq("id", taskId).maybeSingle(),
    supabase.from("tasks").select("code,title").eq("id", blockerId).maybeSingle(),
  ]);
  if (!from || !to) return { error: "Task not found" };

  if (!add) {
    const { error } = await supabase
      .from("dependencies")
      .delete()
      .eq("from_id", taskId)
      .eq("to_id", blockerId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("dependencies").insert({
      from_type: `${from.code ?? ""} · ${from.title}`,
      from_id: taskId,
      to_type: `${to.code ?? ""} · ${to.title}`,
      to_id: blockerId,
      status: "open",
    });
    if (error) return { error: error.message };
  }

  await logAudit(supabase, gate.user.id, add ? "create" : "delete", "dependencies", taskId, null, {
    blocker: blockerId,
  });
  revalidateOs();
  return { success: true };
}

/** Post a comment on a task. The author is always the signed-in user. */
export async function addTaskComment(taskId: string, body: string) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const text = body.trim();
  if (!text) return { error: "Write something first." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, author_id: gate.user.id, body: text });
  if (error) {
    return {
      error: error.message.includes("task_comments")
        ? "Run migration 0015 in Supabase first."
        : error.message,
    };
  }
  revalidateOs();
  return { success: true };
}

/** Remove a comment. RLS already limits this to the author or an admin. */
export async function deleteTaskComment(id: string) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateOs();
  return { success: true };
}
