"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function registerForEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const attendee_name = formData.get("attendee_name") as string;
  const attendee_email = formData.get("attendee_email") as string;
  const attendee_phone = formData.get("attendee_phone") as string;

  if (!attendee_name || !attendee_email) {
    return { error: "Name and email are required." };
  }

  // Double check event capacity and existence
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("spots_left")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return { error: "Event not found." };
  }

  if (event.spots_left <= 0) {
    return { error: "Sorry, this event is full!" };
  }

  const { data, error } = await supabase
    .from("registrations")
    .insert({
      event_id: eventId,
      user_id: user?.id || null,
      attendee_name,
      attendee_email,
      attendee_phone,
      status: "registered",
    })
    .select("ticket_code")
    .single();

  if (error) {
    console.error("Registration error:", error);
    if (error.code === "23505") {
      return { error: "You are already registered for this event." };
    }
    return { error: "Failed to register. Please try again." };
  }

  // Decrement spots_left
  await supabase
    .from("events")
    .update({ spots_left: event.spots_left - 1 })
    .eq("id", eventId);

  return { success: true, ticketCode: data.ticket_code };
}
