"use server";

import { createClient } from "@/lib/supabase/server";
import {
  sendRegistrationConfirmation,
  sendWaitlistJoined,
  sendWaitlistPromoted,
} from "@/lib/email";
import { registerSchema, firstError } from "@/lib/validation";

export async function registerForEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const parsed = registerSchema.safeParse({
    attendee_name: formData.get("attendee_name"),
    attendee_email: formData.get("attendee_email"),
    attendee_phone: formData.get("attendee_phone") ?? undefined,
  });
  if (!parsed.success) {
    return { error: firstError(parsed.error) };
  }
  const { attendee_name, attendee_email, attendee_phone } = parsed.data;

  // Register + decrement capacity atomically (locks the event row server-side,
  // so seats can't oversell and the count actually goes down under RLS).
  const { data, error } = await supabase.rpc("register_for_event", {
    p_event_id: eventId,
    p_attendee_name: attendee_name,
    p_attendee_email: attendee_email,
    p_attendee_phone: attendee_phone,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("ALREADY_REGISTERED"))
      return { error: "You are already registered for this event." };
    if (msg.includes("EVENT_FULL"))
      return { error: "Sorry, this event is full!" };
    if (msg.includes("EVENT_NOT_OPEN"))
      return { error: "Registration for this event isn't open yet." };
    if (msg.includes("EVENT_NOT_FOUND")) return { error: "Event not found." };
    console.error("Registration error:", error);
    return { error: "Failed to register. Please try again." };
  }

  const ticketCode = data as string;

  // Best-effort confirmation email (never blocks registration).
  const { data: event } = await supabase
    .from("events")
    .select("title, date_label, venue")
    .eq("id", eventId)
    .maybeSingle();
  await sendRegistrationConfirmation({
    to: attendee_email,
    name: attendee_name,
    eventTitle: event?.title ?? "your event",
    ticketCode,
    dateLabel: event?.date_label,
    venue: event?.venue,
  });

  return { success: true, ticketCode };
}

export async function joinWaitlist(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const parsed = registerSchema.safeParse({
    attendee_name: formData.get("attendee_name"),
    attendee_email: formData.get("attendee_email"),
    attendee_phone: formData.get("attendee_phone") ?? undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { attendee_name, attendee_email, attendee_phone } = parsed.data;

  const { error } = await supabase.rpc("join_waitlist", {
    p_event_id: eventId,
    p_attendee_name: attendee_name,
    p_attendee_email: attendee_email,
    p_attendee_phone: attendee_phone,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("ALREADY_REGISTERED"))
      return { error: "You're already registered or waitlisted for this event." };
    if (msg.includes("EVENT_NOT_OPEN"))
      return { error: "This event isn't open for registration." };
    if (msg.includes("EVENT_NOT_FOUND")) return { error: "Event not found." };
    console.error("Waitlist error:", error);
    return { error: "Couldn't join the waitlist. Please try again." };
  }

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle();
  await sendWaitlistJoined({
    to: attendee_email,
    name: attendee_name,
    eventTitle: event?.title ?? "the event",
  });

  return { success: true };
}

export async function cancelRegistration(registrationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("cancel_registration", {
    p_registration_id: registrationId,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("FORBIDDEN"))
      return { error: "You can't cancel this registration." };
    if (msg.includes("NOT_FOUND")) return { error: "Registration not found." };
    console.error("Cancellation error:", error);
    return { error: "Couldn't cancel. Please try again." };
  }

  // If a waitlisted attendee was promoted into the freed seat, let them know.
  const promoted = (data as { promoted?: {
    email: string;
    name: string;
    ticket: string;
    event_title: string;
  } | null })?.promoted;
  if (promoted) {
    await sendWaitlistPromoted({
      to: promoted.email,
      name: promoted.name,
      eventTitle: promoted.event_title,
      ticketCode: promoted.ticket,
    });
  }

  return { success: true };
}
