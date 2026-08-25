"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  sendRegistrationConfirmation,
  sendWaitlistJoined,
  sendWaitlistPromoted,
  sendSpotOpened,
} from "@/lib/email";
import { registerSchema, firstError } from "@/lib/validation";

/** Maps an RPC error to a message a human can act on. */
function registrationError(message: string): string {
  if (message.includes("ALREADY_REGISTERED"))
    return "You are already registered for this event.";
  if (message.includes("NOT_ENOUGH_SEATS") || message.includes("EVENT_FULL"))
    return "There aren't enough seats left for that quantity.";
  if (message.includes("MAX_QTY"))
    return "That's more tickets than this ticket type allows per order.";
  if (message.includes("MIN_QTY")) return "Please choose at least one ticket.";
  if (message.includes("SALES_ENDED")) return "Sales for this ticket have closed.";
  if (message.includes("SALES_NOT_STARTED"))
    return "Sales for this ticket haven't opened yet.";
  if (message.includes("EVENT_NOT_OPEN"))
    return "Registration for this event isn't open yet.";
  if (message.includes("EVENT_OVER")) return "This event has already taken place.";
  if (message.includes("EVENT_NOT_FOUND")) return "Event not found.";
  if (message.includes("TICKET_TYPE_NOT_FOUND"))
    return "That ticket type is no longer available.";
  return "Failed to register. Please try again.";
}

export async function registerForEvent(
  eventId: string,
  formData: FormData,
  ticketTypeId?: string,
  quantity = 1,
) {
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

  // With a tier chosen we can book N seats in one order; otherwise fall back
  // to the single-ticket path (which itself routes through the default tier).
  const useOrder = !!ticketTypeId && quantity > 1;
  const { data, error } = useOrder
    ? await supabase.rpc("register_free_order", {
        p_event_id: eventId,
        p_ticket_type_id: ticketTypeId,
        p_quantity: quantity,
        p_buyer_name: attendee_name,
        p_buyer_email: attendee_email,
        p_buyer_phone: attendee_phone,
      })
    : await supabase.rpc("register_for_event", {
        p_event_id: eventId,
        p_attendee_name: attendee_name,
        p_attendee_email: attendee_email,
        p_attendee_phone: attendee_phone,
      });

  if (error) {
    console.error("Registration error:", error);
    return { error: registrationError(error.message ?? "") };
  }

  const codes: string[] = useOrder
    ? ((data as { tickets?: string[] })?.tickets ?? [])
    : [data as string];
  const ticketCode = codes[0];

  // Best-effort confirmation email (never blocks registration).
  const { data: event } = await supabase
    .from("events")
    .select("title, slug, date_label, venue")
    .eq("id", eventId)
    .maybeSingle();
  await sendRegistrationConfirmation({
    to: attendee_email,
    name: attendee_name,
    eventTitle: event?.title ?? "your event",
    ticketCode,
    dateLabel: event?.date_label,
    venue: event?.venue,
    extraTickets: codes.length > 1 ? codes.slice(1) : undefined,
  });

  // In-app notification for signed-in registrants (RLS: own insert).
  const user = await getCurrentUser();
  if (user) {
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "event",
      title: `You're registered for ${event?.title ?? "an event"}`,
      body:
        codes.length > 1
          ? `${codes.length} tickets confirmed — see you there!`
          : `Ticket ${ticketCode.toUpperCase()} — see you there!`,
      link: event?.slug ? `/events/${event.slug}` : null,
    });
  }

  return { success: true, ticketCode, ticketCodes: codes };
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

  const result = data as {
    promoted?: { email: string; name: string; ticket: string; event_title: string } | null;
    spot_opened?: { email: string; name: string; event_title: string; slug: string } | null;
  };

  // Free event: a waitlister was promoted into the freed seat.
  if (result?.promoted) {
    await sendWaitlistPromoted({
      to: result.promoted.email,
      name: result.promoted.name,
      eventTitle: result.promoted.event_title,
      ticketCode: result.promoted.ticket,
    });
  }

  // Paid event: the first waitlister gets a "buy it now" alert instead.
  if (result?.spot_opened) {
    await sendSpotOpened({
      to: result.spot_opened.email,
      name: result.spot_opened.name,
      eventTitle: result.spot_opened.event_title,
      slug: result.spot_opened.slug,
    });
  }

  return { success: true };
}
