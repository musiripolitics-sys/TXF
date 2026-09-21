"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isEmployee } from "@/lib/auth";
import { rupeesToPaise } from "@/lib/bos";

/**
 * Employee Workspace mutations. Gated by isEmployee() (admins pass too). Every
 * write sets owner/requester to the current user; RLS (migration 0008) makes
 * sure staff can only touch their own rows.
 */
async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" as const };
  if (!(await isEmployee())) return { error: "Not authorised" as const };
  return { user };
}

const statusEnum = z.enum(["not_started", "in_progress", "blocked", "completed", "on_hold", "cancelled"]);

export async function setMyTaskStatus(id: string, status: string) {
  const gate = await requireStaff();
  if ("error" in gate) return gate;
  if (!statusEnum.safeParse(status).success) return { error: "Invalid status" };
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id).eq("owner_id", gate.user.id);
  if (error) return { error: error.message };
  revalidatePath("/workspace");
  return { success: true };
}

const taskSchema = z.object({
  title: z.string().trim().min(2, "Task title is required"),
  description: z.string().trim().optional().nullable(),
  due_date: z.string().optional().nullable().transform((v) => v || null),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  workstream_id: z.string().uuid().or(z.literal("")).transform((v) => v || null).optional().nullable(),
});

export async function addMyTask(input: unknown) {
  const gate = await requireStaff();
  if ("error" in gate) return gate;
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({ ...parsed.data, owner_id: gate.user.id, frequency: "one_time" });
  if (error) return { error: error.message };
  revalidatePath("/workspace");
  return { success: true };
}

const expenseSchema = z.object({
  category: z.string().trim().min(1, "Category is required"),
  description: z.string().trim().optional().nullable(),
  amountRupees: z.coerce.number().min(0),
  spent_on: z.string().min(1, "Date is required"),
});

export async function logMyExpense(input: unknown) {
  const gate = await requireStaff();
  if ("error" in gate) return gate;
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    category: parsed.data.category,
    description: parsed.data.description ?? null,
    amount: rupeesToPaise(parsed.data.amountRupees),
    spent_on: parsed.data.spent_on,
    owner_id: gate.user.id,
    approval_status: "pending",
    payment_status: "unpaid",
  });
  if (error) return { error: error.message };
  revalidatePath("/workspace");
  return { success: true };
}

const leadSchema = z.object({
  name: z.string().trim().min(2, "Lead name is required"),
  company: z.string().trim().optional().nullable(),
  contact: z.string().trim().optional().nullable(),
  expectedRupees: z.coerce.number().min(0).default(0),
  probability: z.coerce.number().int().min(0).max(100).default(0),
  stage: z.enum(["lead", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]).default("lead"),
});

export async function addMyLead(input: unknown) {
  const gate = await requireStaff();
  if ("error" in gate) return gate;
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    name: parsed.data.name,
    company: parsed.data.company ?? null,
    contact: parsed.data.contact ?? null,
    expected_revenue: rupeesToPaise(parsed.data.expectedRupees),
    probability: parsed.data.probability,
    stage: parsed.data.stage,
    owner_id: gate.user.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/workspace");
  return { success: true };
}
