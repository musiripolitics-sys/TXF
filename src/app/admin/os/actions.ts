"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  mailTaskAssigned, mailTaskDecision, mailTaskSubmitted,
} from "@/lib/task-mail";
import { sendEmployeeWelcome } from "@/lib/email";
import { productLabels } from "@/lib/os-products";
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
    // Only a change of hands is news. Editing the budget on a task somebody
    // already owns is not worth an email.
    if (data && data.owner_id && data.owner_id !== before?.owner_id) {
      await mailTaskAssigned(data, gate.user.id);
    }
  } else {
    const { data, error } = await supabase.from("tasks").insert(parsed.data).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit(supabase, gate.user.id, "insert", "tasks", data?.id ?? null, null, data);
    if (data?.owner_id) await mailTaskAssigned(data, gate.user.id);
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

/**
 * Admin, or the person this task is assigned to.
 *
 * An employee owns the work, so they own the record: they may retitle it,
 * describe it, move its dates, change its estimate and adjust what it waits
 * on. They may not hand it to somebody else — reassignment stays with whoever
 * planned the work.
 */
async function requireTaskAccess(taskId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" as const };

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id,owner_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "Task not found" as const };

  const admin = await isAdmin();
  if (!admin && task.owner_id !== user.id) {
    return { error: "That task isn't assigned to you." as const };
  }
  return { user, admin };
}

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
  const gate = await requireTaskAccess(id);
  if ("error" in gate) return gate;

  const parsed = taskPatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const patch = parsed.data;
  if (Object.keys(patch).length === 0) return { success: true };

  // Reassignment is a planning decision, not the assignee's to make.
  if (!gate.admin && "owner_id" in patch) {
    return { error: "Only an admin can reassign a task." };
  }

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

  if ("owner_id" in patch && patch.owner_id && patch.owner_id !== before?.owner_id) {
    const { data: after } = await supabase
      .from("tasks")
      .select("id,code,title,description,due_date,priority,owner_id")
      .eq("id", id)
      .maybeSingle();
    if (after) await mailTaskAssigned(after, gate.user.id);
  }

  revalidateOs();
  return { success: true };
}

/** Add or clear an extra blocker in the dependency graph (beyond the critical path). */
export async function setTaskEdge(taskId: string, blockerId: string, add: boolean) {
  const gate = await requireTaskAccess(taskId);
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
  // Commenting is not editing: anyone who can see the task may say something
  // about it, which is the point of a thread.
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  const gate = { user };
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
  // RLS already limits this to the author or an admin.
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateOs();
  return { success: true };
}

// ─────────────────────── People and access ───────────────────────

/**
 * Replace a person's product grants. Delegates to bos_set_module_access,
 * which re-checks admin in the database and refuses to let an admin edit
 * their own access — so a mistake here cannot lock the OS.
 *
 * The nine keys used to be listed here as well as in os-access.ts, the access
 * page and a CHECK constraint. Since Stage 1 of the BOS Product Model plan the
 * catalogue is public.products and the database validates against it, so an
 * unknown key comes back named rather than being silently dropped — which is
 * what the old filter here did.
 */
export async function setModuleAccess(userId: string, sections: string[]) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;

  const clean = [...new Set(sections)].map((s) => s.trim()).filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase.rpc("bos_set_module_access", {
    p_user: userId,
    p_sections: clean,
  });
  if (error) {
    if (error.message.includes("CANNOT_EDIT_OWN_ACCESS")) {
      return { error: "You can't change your own access." };
    }
    if (error.message.includes("UNKNOWN_PRODUCT")) {
      const bad = error.message.split("UNKNOWN_PRODUCT:")[1]?.trim();
      return { error: `No such product: ${bad}. Check the product list.` };
    }
    return {
      error: error.message.includes("bos_set_module_access")
        ? "Run migration 0016 in Supabase first."
        : error.message,
    };
  }

  await logAudit(supabase, gate.user.id, "update", "employee_module_access", userId, null, {
    sections: clean,
  });
  revalidateOs();
  return { success: true };
}

const newEmployeeSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  title: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  start_date: optDate,
  // Not an enum: the product list is data now, and bos_set_module_access
  // rejects a key the catalogue does not hold.
  sections: z.array(z.string().trim().min(1)).default([]),
});

/**
 * Onboard an employee here, rather than waiting for them to sign up and then
 * promoting them. Creates the account, marks them an employee, records their
 * title and department, and grants their sections in one step.
 *
 * If the email already has an account — someone who registered as a member
 * first — that account is promoted instead of failing, because the alternative
 * is an admin stuck with an error and no way forward.
 */
export async function createEmployee(input: unknown) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;

  const parsed = newEmployeeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { full_name, email, password, title, department, start_date, sections } = parsed.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { error: "Creating accounts isn't configured on the server (missing SUPABASE_SERVICE_ROLE_KEY)." };
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const supabase = await createClient();
  let userId: string | null = null;
  let promoted = false;

  // Already registered? Promote rather than fail.
  const { data: existing } = await supabase
    .from("users")
    .select("id,primary_role")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.primary_role === "admin") {
      return { error: "That email belongs to an admin, who already has every section." };
    }
    userId = existing.id as string;
    promoted = true;
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created?.user) {
      return { error: createErr?.message ?? "Could not create the account." };
    }
    userId = created.user.id;
  }

  // handle_new_user() writes the public.users row; make them an employee.
  const { error: roleErr } = await supabase
    .from("users")
    .update({ primary_role: "employee", full_name })
    .eq("id", userId);
  if (roleErr) return { error: roleErr.message };

  // Title and department live on employee_profiles, which People & Hiring reads.
  await supabase.from("employee_profiles").upsert(
    {
      user_id: userId,
      title: title || null,
      department: department || null,
      start_date: start_date || null,
      status: "active",
    },
    { onConflict: "user_id" },
  );

  if (sections.length > 0) {
    const { error: accessErr } = await supabase.rpc("bos_set_module_access", {
      p_user: userId,
      p_sections: sections,
    });
    if (accessErr) {
      return {
        error: accessErr.message.includes("bos_set_module_access")
          ? "Employee created, but run migration 0016 before assigning sections."
          : accessErr.message,
      };
    }
  }

  await logAudit(supabase, gate.user.id, "create", "users", userId, null, {
    full_name,
    email,
    primary_role: "employee",
    sections,
    promoted,
  });

  // No password in here — the admin who set it hands it over directly, and a
  // credential in a mailbox outlives its usefulness immediately.
  try {
    await sendEmployeeWelcome({
      to: email,
      name: full_name.split(" ")[0] || full_name,
      title: title || null,
      sections: await (async () => {
        const labels = await productLabels();
        return sections.map((k) => labels[k] ?? k);
      })(),
    });
  } catch {
    // An account that exists but whose welcome bounced is still an account.
  }

  revalidateOs();
  return { success: true, promoted };
}

/** Take someone off the team: revoke every section and mark the profile ended. */
export async function offboardEmployee(userId: string) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  if (userId === gate.user.id) return { error: "You can't offboard yourself." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("bos_set_module_access", {
    p_user: userId,
    p_sections: [],
  });
  if (error && !error.message.includes("bos_set_module_access")) {
    return { error: error.message };
  }

  await supabase.from("employee_profiles").update({ status: "ended" }).eq("user_id", userId);
  await supabase.from("users").update({ primary_role: "community_member" }).eq("id", userId);

  await logAudit(supabase, gate.user.id, "update", "users", userId, null, { offboarded: true });
  revalidateOs();
  return { success: true };
}

// ─────────────────────── An employee's own work ───────────────────────

/**
 * Move one of your own tasks between stages.
 *
 * setTaskStatus() requires admin, which left an employee looking at their
 * tasks unable to touch them. The RLS policy "owner update own task" already
 * allows this; only the action was in the way. The owner check is repeated
 * here so a wrong id fails with a clear message rather than silently
 * updating nothing.
 */
export async function setMyTaskStatus(taskId: string, status: z.infer<typeof statusEnum>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  if (!statusEnum.safeParse(status).success) return { error: "Unknown status" };

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id,owner_id,status")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) return { error: "Task not found" };
  if (task.owner_id !== user.id && !(await isAdmin())) {
    return { error: "That task isn't assigned to you." };
  }

  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) return { error: error.message };

  await logAudit(supabase, user.id, "update", "tasks", taskId, { status: task.status }, { status });
  revalidateOs();
  revalidatePath("/workspace");
  return { success: true };
}

// ───────────────────────── Task approval ─────────────────────────
//
// Completing a task is not the assignee's call. They submit it and an admin
// approves; approving is what completes it. Migration 0020 enforces all of
// this in a trigger, so these actions mostly exist to carry its message back
// to the person rather than to do the checking themselves.

/** Put a finished task up for approval. Needs an assignee and a comment. */
export async function submitTaskForApproval(taskId: string) {
  const gate = await requireTaskAccess(taskId);
  if ("error" in gate) return gate;

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ approval_state: "pending", decision_note: null })
    .eq("id", taskId);
  if (error) return { error: error.message };

  await logAudit(supabase, gate.user.id, "update", "tasks", taskId, null, {
    approval_state: "pending",
  });

  const { data: submitted } = await supabase
    .from("tasks")
    .select("id,code,title,owner_id")
    .eq("id", taskId)
    .maybeSingle();
  if (submitted) await mailTaskSubmitted(submitted, gate.user.id);

  revalidateOs();
  return { success: true };
}

/**
 * Approve the work, which completes it, or send it back with a reason.
 *
 * Approving writes the status in the same update: the trigger reads the new
 * approval_state, so one statement satisfies the gate where two would have to
 * be ordered carefully.
 */
export async function decideTaskApproval(
  taskId: string,
  decision: "approved" | "rejected",
  note?: string,
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;
  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Unknown decision" };
  }
  const trimmed = (note ?? "").trim();
  if (decision === "rejected" && !trimmed) {
    return { error: "Say why it is going back, so the work can be fixed." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      approval_state: decision,
      decision_note: trimmed || null,
      ...(decision === "approved" ? { status: "completed" } : {}),
    })
    .eq("id", taskId);
  if (error) return { error: error.message };

  await logAudit(supabase, gate.user.id, "update", "tasks", taskId, null, {
    approval_state: decision,
    decision_note: trimmed || null,
  });

  const { data: decided } = await supabase
    .from("tasks")
    .select("id,code,title,owner_id")
    .eq("id", taskId)
    .maybeSingle();
  if (decided) {
    await mailTaskDecision(decided, decision === "approved", trimmed || null, gate.user.id);
  }

  revalidateOs();
  revalidatePath("/admin/os/approvals");
  return { success: true };
}

// ─────────────────────────── Products ───────────────────────────

/**
 * Turn a product on or off for the whole install.
 *
 * Off means off for everyone, admins included — bos_can_access refuses a
 * disabled product whoever asks. That is deliberate: a toggle an admin can
 * see through is not a toggle. It is also why this lives behind the access
 * page, which is guarded by isAdmin directly rather than by requireSection,
 * so disabling a product can never lock an admin out of re-enabling it.
 *
 * Grants are left alone. Re-enabling restores exactly who had it before,
 * which matters because the alternative — cascading a delete through
 * employee_module_access — makes a reversible toggle quietly destructive.
 */
export async function setProductEnabled(key: string, enabled: boolean) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("products")
    .select("key,is_enabled")
    .eq("key", key)
    .maybeSingle();
  if (!before) return { error: `No such product: ${key}` };

  const { error } = await supabase
    .from("products")
    .update({ is_enabled: enabled })
    .eq("key", key);
  if (error) {
    return {
      error: error.message.includes("products")
        ? "Run migration 0033 in Supabase first."
        : error.message,
    };
  }

  await logAudit(supabase, gate.user.id, "update", "products", key, before, {
    key,
    is_enabled: enabled,
  });
  revalidatePath(OS, "layout");
  return { success: true };
}

const productSchema = z.object({
  name: z.string().trim().min(2, "A name is required"),
  description: z.string().trim().max(400).optional().nullable(),
});

/**
 * Rename a product, or change the line of description under it. The nav reads
 * products.name, so renaming Govern to Compliance renames it everywhere —
 * which is the whole point of the catalogue being data.
 *
 * The key is never editable. It is referenced by employee_module_access and
 * by requireSection in the page code, so changing it would orphan both.
 */
export async function updateProduct(key: string, input: unknown) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate;

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("products")
    .select("key,name,description")
    .eq("key", key)
    .maybeSingle();
  if (!before) return { error: `No such product: ${key}` };

  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq("key", key);
  if (error) return { error: error.message };

  await logAudit(supabase, gate.user.id, "update", "products", key, before, parsed.data);
  revalidatePath(OS, "layout");
  return { success: true };
}
