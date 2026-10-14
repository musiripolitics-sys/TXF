import { z } from "zod";

// Reusable field pieces
const name = z.string().trim().min(1, "Name is required").max(120);
const email = z.string().trim().email("A valid email is required").max(200);
const phone = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((v) => (v ? v : null));
const uuid = z.string().uuid("Invalid id");

export const registerSchema = z.object({
  attendee_name: name,
  attendee_email: email,
  attendee_phone: phone,
});

const promoCode = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((v) => (v ? v : null));

export const ticketOrderSchema = z.object({
  eventId: uuid,
  // Which tier, and how many seats. Omitted = the event's default tier, qty 1.
  ticketTypeId: uuid.optional(),
  quantity: z.number().int().min(1).max(20).optional(),
  promoCode,
  // Attendee details ride along so the Razorpay order notes carry everything
  // the webhook needs to fulfil the ticket if the browser never comes back.
  attendee_name: name,
  attendee_email: email,
  attendee_phone: phone,
  /**
   * The organiser's own questions, keyed by question id.
   *
   * The free path has carried these since the questions feature existed —
   * registerForEvent reads q_<id> off the form and hands them to
   * register_free_order. The paid path never did, so an event that asked
   * which week you wanted threw the answer away the moment the ticket cost
   * money. orders.answers and create_pending_order's p_answers were both
   * already there waiting; only these two layers were missing.
   */
  answers: z.record(z.string().uuid(), z.string().max(2000)).optional(),
});

export const ticketVerifySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  eventId: uuid,
  // Our own pending order — fulfilment reads price/quantity from it.
  txfOrderId: uuid.optional(),
  promoCode,
  attendee_name: name,
  attendee_email: email,
  attendee_phone: phone,
});

export const membershipOrderSchema = z.object({
  tier: z.enum(["Pro", "Elite"]),
});

export const membershipVerifySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  tier: z.enum(["Pro", "Elite"]),
});

export const postSchema = z.object({
  body: z.string().trim().min(1, "Write something first").max(1000, "Keep it under 1000 characters"),
});

export const hostDecisionSchema = z.object({
  userId: uuid,
  approve: z.boolean(),
});

/** First human-readable error message from a ZodError. */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input";
}
