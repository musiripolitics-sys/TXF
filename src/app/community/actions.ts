"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { postSchema, firstError } from "@/lib/validation";

const roleLabel: Record<string, string> = {
  community_member: "Member",
  event_host: "Host",
  admin: "Admin",
};

const TOPIC_CHANNELS = ["all", "meetups", "tech"];

export async function createPost(
  body: string,
  channel: string,
  eventId?: string | null,
) {
  const parsed = postSchema.safeParse({ body });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in to post." };

  // Session-group posts carry an eventId; topic posts carry a topic channel.
  const ch = eventId ? "event" : TOPIC_CHANNELS.includes(channel) ? channel : "all";

  const supabase = await createClient();

  // Author name/role are derived server-side from the poster's own profile
  // (readable under RLS), so they can't be spoofed by the client.
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, primary_role")
    .eq("id", user.id)
    .maybeSingle();

  // RLS rejects the insert if this is a session group the user didn't attend.
  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    author_name: profile?.full_name || "Member",
    author_role: roleLabel[profile?.primary_role ?? "community_member"] ?? "Member",
    body: parsed.data.body,
    channel: ch,
    event_id: eventId ?? null,
  });

  if (error) {
    console.error("Create post error:", error);
    return { error: "Couldn't post here. You may not have access to this group." };
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
