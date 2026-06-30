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
 * Validate a scanned/typed ticket code, mark the attendee checked in, and
 * award them 10 attendance points. All of it runs in the `check_in_ticket`
 * RPC (SECURITY DEFINER) so it can credit the attendee's points and enforce
 * host/admin authorization atomically.
 */
export async function checkInTicket(rawCode: string): Promise<CheckInResult> {
  const code = rawCode.trim();
  if (!code) return { status: "invalid", message: "No ticket code provided." };

  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You're not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_ticket", { p_code: code });

  if (error || !data) {
    console.error("Check-in error:", error);
    return { status: "error", message: "Check-in failed. Please try again." };
  }
  return data as CheckInResult;
}
