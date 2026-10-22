"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";

/**
 * Where covers live: a prefix inside the project's one public bucket, rather
 * than a bucket of their own. Public is the requirement — these render on the
 * events listing to people who are not signed in.
 *
 * Note for anything added later: community downloads must NOT go in here.
 * They are a paid unlock served as short-lived signed URLs, and a public
 * bucket would make that gate decoration.
 */
const BUCKET = "TXF";
const PREFIX = "event-covers";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Set an event's cover image.
 *
 * image_url has been a column since the beginning and no form has ever
 * written it, so every event falls back to the category gradient on its card.
 * Both roles get this: an admin, and the host of that particular event.
 *
 * Authorisation is explicit rather than left to RLS. The upload runs with the
 * service key — storage has no row policies to lean on here — so the check
 * that the caller owns this event has to happen in this function, before
 * anything is written.
 */
export async function setEventCover(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const file = formData.get("file");
  if (!eventId) return { error: "Missing event." };

  const user = await getCurrentUser();
  if (!user) return { error: "You're not signed in." };

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, host_id, image_url")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { error: "That event could not be found." };
  if (event.host_id !== user.id && !(await isAdmin())) {
    return { error: "That isn't your event." };
  }

  // Clearing is a write of its own, and needs no upload.
  if (!(file instanceof File) || file.size === 0) {
    if (formData.get("clear") === "1") {
      const { error } = await supabase
        .from("events")
        .update({ image_url: null })
        .eq("id", eventId);
      if (error) return { error: "Couldn't clear the cover." };
      return { url: null as string | null };
    }
    return { error: "Choose an image to upload." };
  }

  if (!ACCEPTED.includes(file.type)) {
    return { error: "Use a JPEG, PNG, WebP or AVIF image." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Images must be 5 MB or smaller." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { error: "Uploads aren't configured on the server." };
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Namespaced by event, and a fresh name every time: the public URL is
  // cached by the CDN, so reusing a path would serve the old picture.
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${PREFIX}/${eventId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) {
    console.error("Cover upload:", upErr);
    return {
      error: upErr.message.includes("Bucket not found")
        ? `The '${BUCKET}' storage bucket doesn't exist. Create it (public) in Supabase → Storage.`
        : "Upload failed. Please try again.",
    };
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error: saveErr } = await supabase
    .from("events")
    .update({ image_url: publicUrl })
    .eq("id", eventId);

  if (saveErr) {
    // Don't leave the file behind for a row that never pointed at it.
    await admin.storage.from(BUCKET).remove([path]);
    return { error: "Couldn't save the cover on the event." };
  }

  // The old file is nobody's now. Best effort: a cover that is set and
  // showing matters more than a stray object in the bucket.
  const previous = event.image_url;
  if (previous && previous.includes(`/${BUCKET}/`)) {
    const oldPath = previous.split(`/${BUCKET}/`)[1];
    if (oldPath) await admin.storage.from(BUCKET).remove([oldPath]);
  }

  return { url: publicUrl };
}
