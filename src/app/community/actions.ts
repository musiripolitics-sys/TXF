"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { postSchema, firstError } from "@/lib/validation";

const roleLabel: Record<string, string> = {
  community_member: "Member",
  event_host: "Host",
  admin: "Admin",
};

export async function createPost(body: string) {
  const parsed = postSchema.safeParse({ body });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in to post." };

  const supabase = await createClient();

  // Author name/role are derived server-side from the poster's own profile
  // (readable under RLS), so they can't be spoofed by the client.
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, primary_role")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    author_name: profile?.full_name || "Member",
    author_role: roleLabel[profile?.primary_role ?? "community_member"] ?? "Member",
    body: parsed.data.body,
  });

  if (error) {
    console.error("Create post error:", error);
    return { error: "Couldn't post. Please try again." };
  }
  return { success: true };
}

export async function createComment(postId: string, body: string) {
  const parsed = postSchema.safeParse({ body });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in to comment." };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    author_id: user.id,
    author_name: profile?.full_name || "Member",
    body: parsed.data.body,
  });

  if (error) {
    console.error("Create comment error:", error);
    return { error: "Couldn't comment. Please try again." };
  }
  return { success: true };
}
