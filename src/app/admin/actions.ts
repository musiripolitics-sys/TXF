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

  // decide_host updates the profile (is_admin-gated) AND creates an in-app
  // notification for the user in one call.
  const { error } = await supabase.rpc("decide_host", {
    p_user_id: userId,
    p_approve: approve,
  });
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
