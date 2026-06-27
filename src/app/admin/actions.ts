"use server";

import { createClient } from "@/lib/supabase/server";
import { sendHostDecision } from "@/lib/email";
import { hostDecisionSchema, firstError } from "@/lib/validation";

/**
 * Approve or reject a pending host request. Updates the profile (RLS allows
 * admins) and emails the user the decision. Admin-gated by RLS on `users`.
 */
export async function decideHostRequest(userId: string, approve: boolean) {
  const parsed = hostDecisionSchema.safeParse({ userId, approve });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();

  const update = approve
    ? { primary_role: "event_host", host_status: "approved" }
    : { host_status: "rejected" };

  const { error } = await supabase.from("users").update(update).eq("id", userId);
  if (error) return { error: error.message };

  const { data: u } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (u?.email) {
    await sendHostDecision({
      to: u.email,
      name: u.full_name || "there",
      approved: approve,
    });
  }

  return { success: true };
}
