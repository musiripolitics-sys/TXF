"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";

/** Approve / reject an approval request via the decide_approval RPC (0009),
 * which stamps the decision and notifies the requester. Audit-logged. */
export async function decideApproval(id: string, decision: "approved" | "rejected" | "pending", comments?: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  if (!(await isAdmin())) return { error: "Not authorised" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_approval", {
    p_id: id,
    p_decision: decision,
    p_comments: comments ?? null,
  });
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "decide",
    entity: "approvals",
    entity_id: id,
    after: { decision, comments: comments ?? null },
  });

  revalidatePath("/admin/os/approvals");
  revalidatePath("/admin/os");
  return { success: true };
}
