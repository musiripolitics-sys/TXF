"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/** Join a chapter. The database decides; this relays the verdict. */
export async function joinCommunity(communityId: string, slug: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to join a chapter." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_community", {
    p_community: communityId,
  });

  if (error) {
    console.error("Join community error:", error);
    return { error: "Couldn't join right now. Please try again." };
  }

  const result = data as { status: string; message: string };
  if (result.status === "denied") return { error: result.message };

  revalidatePath(`/c/${slug}`);
  return { success: true, status: result.status, message: result.message };
}

export async function leaveCommunity(communityId: string, slug: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "You're not signed in." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_community", {
    p_community: communityId,
  });

  if (error) {
    console.error("Leave community error:", error);
    return { error: "Couldn't leave right now. Please try again." };
  }

  revalidatePath(`/c/${slug}`);
  return { success: true };
}
