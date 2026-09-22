"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";

const schema = z.object({
  period_type: z.enum(["week", "month"]),
  period_start: z.string().min(1),
  what_worked: z.string().trim().optional().nullable(),
  what_failed: z.string().trim().optional().nullable(),
  why_text: z.string().trim().optional().nullable(),
  corrective_action: z.string().trim().optional().nullable(),
  next_priority: z.string().trim().optional().nullable(),
});

/** Upsert the qualitative retrospective for a week/month. Metrics are computed
 * live on the page — only these notes persist. */
export async function saveReview(input: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  if (!(await isAdmin())) return { error: "Not authorised" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .upsert(parsed.data, { onConflict: "period_type,period_start" })
    .select()
    .maybeSingle();
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "upsert",
    entity: "reviews",
    entity_id: data?.id ?? null,
    after: parsed.data,
  });

  revalidatePath("/admin/os/reviews");
  return { success: true };
}
