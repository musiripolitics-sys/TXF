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

export const ticketOrderSchema = z.object({
  eventId: uuid,
});

export const ticketVerifySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  eventId: uuid,
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

export const hostDecisionSchema = z.object({
  userId: uuid,
  approve: z.boolean(),
});

/** First human-readable error message from a ZodError. */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input";
}
