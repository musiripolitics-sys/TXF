"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export type CheckInResult = {
  status: "ok" | "already" | "invalid" | "error";
  message: string;
  attendeeName?: string;
  eventTitle?: string;
  checkedInAt?: string;
};

/**
 * Validate a scanned/typed ticket code and mark the attendee checked in.
 * RLS does the authorization: a host can only read/update registrations for
 * their own events (admins, any). So an unknown or other-host ticket simply
 * returns "not found".
 */
export async function checkInTicket(rawCode: string): Promise<CheckInResult> {
  const code = rawCode.trim().toLowerCase();
  if (!code) return { status: "invalid", message: "No ticket code provided." };

  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You're not signed in." };

  const supabase = await createClient();

  const { data: reg, error } = await supabase
    .from("registrations")
    .select("id, attendee_name, checked_in_at, events(title)")
    .eq("ticket_code", code)
    .maybeSingle();

  if (error || !reg) {
    return {
      status: "invalid",
      message: "Ticket not found — or it's not for one of your events.",
    };
  }

  const eventTitle = (reg.events as { title?: string } | null)?.title;

  if (reg.checked_in_at) {
    return {
      status: "already",
      message: "Already checked in",
      attendeeName: reg.attendee_name,
      eventTitle,
      checkedInAt: reg.checked_in_at,
    };
  }

  const { error: upErr } = await supabase
    .from("registrations")
    .update({ checked_in_at: new Date().toISOString(), status: "attended" })
    .eq("id", reg.id);

  if (upErr) {
    return {
      status: "error",
      message: "Couldn't check in — you may not manage this event.",
    };
  }

  return {
    status: "ok",
    message: "Checked in",
    attendeeName: reg.attendee_name,
    eventTitle,
  };
}
