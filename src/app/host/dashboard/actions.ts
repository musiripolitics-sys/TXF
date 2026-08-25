"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { sendAttendeeBroadcast } from "@/lib/email";

/**
 * Email everyone holding a live ticket for one of the host's own events.
 * Authorisation is explicit: the caller must own the event (or be an admin).
 */
export async function messageAttendees(eventId: string, message: string) {
  const body = message.trim();
  if (body.length < 5) return { error: "Write a slightly longer message." };
  if (body.length > 2000) return { error: "Keep it under 2000 characters." };

  const user = await getCurrentUser();
  if (!user) return { error: "You're not signed in." };

  const supabase = await createClient();

  // Ownership check — RLS also restricts the read below, this makes it explicit.
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, host_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: "Event not found." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (event.host_id !== user.id && isAdmin !== true) {
    return { error: "You can only message attendees of your own events." };
  }

  const { data: regs } = await supabase
    .from("registrations")
    .select("attendee_name, attendee_email, user_id")
    .eq("event_id", eventId)
    .in("status", ["registered", "attended"]);

  const recipients = regs ?? [];
  if (recipients.length === 0) return { error: "This event has no attendees yet." };

  // De-duplicate: someone holding 3 tickets should get one email.
  const seen = new Set<string>();
  let sent = 0;
  for (const r of recipients) {
    const key = r.attendee_email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    await sendAttendeeBroadcast({
      to: r.attendee_email,
      name: r.attendee_name,
      eventTitle: event.title,
      message: body,
    });
    sent++;
  }

  // In-app notification for attendees who have accounts.
  const userIds = [...new Set(recipients.map((r) => r.user_id).filter(Boolean))];
  if (userIds.length > 0) {
    await supabase.from("notifications").insert(
      userIds.map((id) => ({
        user_id: id as string,
        type: "event",
        title: `Update from ${event.title}`,
        body: body.slice(0, 140),
        link: `/events/${event.slug}`,
      })),
    );
  }

  return { success: true, sent };
}
