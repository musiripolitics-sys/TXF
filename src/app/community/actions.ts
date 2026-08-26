"use server";

import { revalidatePath } from "next/cache";
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
    return { error: await explainPostRejection(supabase, user.id, !eventId) };
  }
  return { success: true };
}

export async function createComment(
  postId: string,
  body: string,
  parentId?: string | null,
) {
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
    parent_id: parentId ?? null,
  });

  if (error) {
    console.error("Create comment error:", error);
    return { error: await explainCommentRejection(supabase, user.id) };
  }
  return { success: true };
}

/**
 * RLS reports a gate failure as a generic policy violation, which is useless
 * to the person who just wrote a paragraph. Work out which rule they missed
 * and say so, with the number they need.
 */
async function explainRejection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: "post_group" | "post_global" | "comment",
  fallback: string,
): Promise<string> {
  try {
    const [{ data: gate }, { data: me }] = await Promise.all([
      supabase
        .from("community_gates")
        .select("min_balance")
        .eq("action", action)
        .maybeSingle(),
      supabase.from("users").select("points").eq("id", userId).maybeSingle(),
    ]);

    const need = gate?.min_balance ?? 0;
    const have = me?.points ?? 0;
    if (need > 0 && have < need) {
      return `You need ${need} credits to do that — you have ${have}. Attend a session to earn 10 more.`;
    }
  } catch {
    // Fall through to the access-based message below.
  }
  return fallback;
}

function explainPostRejection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isGlobal: boolean,
) {
  return explainRejection(
    supabase,
    userId,
    isGlobal ? "post_global" : "post_group",
    "Couldn't post here. You may not have access to this group.",
  );
}

function explainCommentRejection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  return explainRejection(
    supabase,
    userId,
    "comment",
    "Couldn't comment. Please try again.",
  );
}

/**
 * Spend credits on a download. The database decides — this only relays the
 * verdict. A successful unlock returns a short-lived signed URL.
 */
export async function unlockFile(fileId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to download this." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unlock_file", { p_file_id: fileId });

  if (error) {
    console.error("Unlock file error:", error);
    return { error: "Couldn't unlock that file. Please try again." };
  }

  const result = data as
    | { status: "ok"; path: string }
    | { status: "short"; message: string; needed: number; balance: number }
    | { status: "denied"; message: string };

  if (result.status !== "ok") return { error: result.message };

  // The path is only ever handed out after the database confirms the unlock,
  // and the URL it produces expires in a minute.
  const { data: signed, error: signErr } = await supabase.storage
    .from("community")
    .createSignedUrl(result.path, 60);

  if (signErr || !signed?.signedUrl) {
    console.error("Sign URL error:", signErr);
    return { error: "The file is unlocked but the download link failed. Try again." };
  }
  return { url: signed.signedUrl };
}

/**
 * Admin: put a file on a session group's shelf.
 *
 * Uploads run through the service-role client because the storage bucket is
 * private — but the admin check happens here first, server-side, and the row
 * insert still passes through RLS.
 */
export async function uploadGroupFile(formData: FormData) {
  const { isAdmin } = await import("@/lib/auth");
  if (!(await isAdmin())) return { error: "Admins only." };

  const user = await getCurrentUser();
  if (!user) return { error: "You're not signed in." };

  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const cost = Number(formData.get("creditCost") ?? 0);

  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (!title) return { error: "Give the file a title." };
  if (!eventId) return { error: "Missing group." };
  if (!Number.isFinite(cost) || cost < 0) return { error: "Credit cost must be 0 or more." };
  if (file.size > 50 * 1024 * 1024) return { error: "Files must be 50 MB or smaller." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { error: "Uploads aren't configured on the server (missing SUPABASE_SERVICE_ROLE_KEY)." };
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Namespace by group, and keep the original extension for the download name.
  const ext = file.name.includes(".") ? file.name.split(".").pop() : null;
  const path = `${eventId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error: upErr } = await admin.storage
    .from("community")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });

  if (upErr) {
    console.error("Upload error:", upErr);
    return {
      error: upErr.message.includes("Bucket not found")
        ? "The 'community' storage bucket doesn't exist yet. Create it (private) in Supabase → Storage."
        : "Upload failed. Please try again.",
    };
  }

  const supabase = await createClient();
  const { error: insErr } = await supabase.from("community_files").insert({
    event_id: eventId,
    title,
    description: description || null,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
    credit_cost: Math.round(cost),
    created_by: user.id,
  });

  if (insErr) {
    // Don't leave an orphan in storage if the row didn't land.
    await admin.storage.from("community").remove([path]);
    console.error("Insert file row error:", insErr);
    return { error: "Couldn't save the file. Please try again." };
  }

  revalidatePath(`/community/g/${eventId}`);
  return { success: true };
}

/**
 * Report a post or comment. The database notifies every admin and keeps the
 * report row, so the queue outlives a dismissed notification.
 */
export async function reportContent(
  target: { postId?: string; commentId?: string },
  reason: string,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to report this." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_content", {
    p_post_id: target.postId ?? null,
    p_comment_id: target.commentId ?? null,
    p_reason: reason.slice(0, 500),
  });

  if (error) {
    console.error("Report error:", error);
    return { error: "Couldn't send that report. Please try again." };
  }

  const result = data as { status: string; message: string };
  if (result.status !== "ok") return { error: result.message };
  return { success: true, message: result.message };
}
