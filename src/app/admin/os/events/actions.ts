"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";

const schema = z.object({
  event_id: z.string().uuid(),
  event_type: z.string().trim().optional().nullable(),
  is_client_event: z.coerce.boolean().default(false),
  client_name: z.string().trim().optional().nullable(),
  owner_id: z.string().uuid().or(z.literal("")).transform((v) => v || null).optional().nullable(),
  budget: z.coerce.number().int().min(0).default(0),
  actual_cost: z.coerce.number().int().min(0).default(0),
  revenue_target: z.coerce.number().int().min(0).default(0),
  marketing_campaign_id: z.string().uuid().or(z.literal("")).transform((v) => v || null).optional().nullable(),
  partners: z.string().trim().optional().nullable(),
  feedback: z.string().trim().optional().nullable(),
});

/** Upsert the BOS financial/ops row for an existing event (1:1 event_ops). */
export async function saveEventOps(input: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  if (!(await isAdmin())) return { error: "Not authorised" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_ops")
    .upsert(parsed.data, { onConflict: "event_id" })
    .select()
    .maybeSingle();
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    user_id: user.id, action: "upsert", entity: "event_ops",
    entity_id: data?.id ?? null, after: parsed.data,
  });

  revalidatePath("/admin/os/events");
  revalidatePath("/admin/os");
  return { success: true };
}
