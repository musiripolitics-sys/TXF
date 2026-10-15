"use client";

import type { RazorpayHandlerResponse } from "@/types/razorpay";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { registerForEvent, joinWaitlist } from "@/app/events/[slug]/actions";
import { Icon } from "./Icon";
import type { TicketType, EventQuestion } from "@/lib/data";
import type { NextStepsProps } from "./RegistrationNextSteps";
import { googleCalUrl } from "@/lib/calendar";

interface RegistrationFormProps {
  eventId: string;
  isFull: boolean;
  isPaid?: boolean;
  priceLabel?: string;
  memberNote?: string;
  ticketTypes?: TicketType[];
  questions?: EventQuestion[];
  userProfile?: {
    full_name?: string;
    email?: string;
    phone?: string;
  } | null;
  onClose?: () => void;
  eventTitle?: string;
}

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

export function RegistrationForm({
  eventId,
  isFull,
  isPaid = false,
  priceLabel,
  memberNote,
  ticketTypes = [],
  questions = [],
  userProfile,
  onClose,
  eventTitle,
  nextSteps,
}: RegistrationFormProps & { nextSteps?: NextStepsProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attendeeName, setAttendeeName] = useState(userProfile?.full_name || "");
  const [copied, setCopied] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [promo, setPromo] = useState("");

  // Tiers that can actually be bought right now.
  const sellable = ticketTypes.filter(
    (t) => !t.salesEnded && !t.salesNotStarted && t.available > 0,
  );
  const [tierId, setTierId] = useState<string>(sellable[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const tier = sellable.find((t) => t.id === tierId) ?? sellable[0];
  const maxQty = Math.min(tier?.maxPerOrder ?? 10, tier?.available ?? 10);

  const subtotal = (tier?.priceAmount ?? 0) * qty;
  const waitlistMode = isFull;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const nameVal = (formData.get("attendee_name") as string)?.trim();
    if (nameVal) setAttendeeName(nameVal);

    const attendee = {
      attendee_name: nameVal,
      attendee_email: (formData.get("attendee_email") as string)?.trim(),
      attendee_phone: (formData.get("attendee_phone") as string)?.trim() || "",
    };

    const answers: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("q_") && typeof value === "string" && value.trim()) {
        answers[key.slice(2)] = value.trim();
      }
    }

    if (waitlistMode) {
      setLoading(true);
      const res = await joinWaitlist(eventId, formData);
      if (res.error) setError(res.error);
      else if (res.success) setWaitlisted(true);
      setLoading(false);
      return;
    }

    if (isPaid) {
      await handlePaid(attendee, answers);
      return;
    }

    // Free event registration
    setLoading(true);
    const res = await registerForEvent(eventId, formData, tier?.id, qty);
    if (res.error) {
      setError(res.error);
    } else if (res.success && res.ticketCode) {
      setSuccess(res.ticketCode);
      router.refresh();
    }
    setLoading(false);
  }

  async function handlePaid(
    attendee: {
      attendee_name: string;
      attendee_email: string;
      attendee_phone: string;
    },
    answers: Record<string, string>,
  ) {
    if (!userProfile?.email) {
      const next = typeof window !== "undefined" ? window.location.pathname : "/";
      router.push(`/login?mode=signup&next=${encodeURIComponent(next)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/ticket-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          ticketTypeId: tier?.id,
          quantity: qty,
          promoCode: promo.trim() || undefined,
          answers: Object.keys(answers).length ? answers : undefined,
          ...attendee,
        }),
      });
      const order = await res.json();
      if (!res.ok || order.error) {
        setError(order.error || "Failed to start payment.");
        setLoading(false);
        return;
      }

      if (order.free) {
        setSuccess(order.tickets?.[0] ?? "");
        setLoading(false);
        router.refresh();
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Techxfluence",
        description: eventTitle || "Event pass",
        order_id: order.orderId,
        prefill: {
          name: attendee.attendee_name,
          email: attendee.attendee_email,
          contact: attendee.attendee_phone,
        },
        theme: { color: "#ff5a1f" },
        handler: async (response: RazorpayHandlerResponse) => {
          setLoading(true);
          try {
            const verifyRes = await fetch("/api/payments/ticket-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                eventId,
                txfOrderId: order.txfOrderId,
                promoCode: promo.trim() || undefined,
                ...attendee,
              }),
            });
            const verify = await verifyRes.json();
            if (verifyRes.ok && verify.success) {
              setSuccess(verify.ticketCode);
              router.refresh();
            } else {
              setError(verify.error || "Payment verification failed.");
            }
          } catch {
            setError("Connection error during verification.");
          } finally {
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      const Checkout = window.Razorpay;
      if (!Checkout) throw new Error("The payment window did not load. Please try again.");
      const rzp = new Checkout(options);
      rzp.open();
    } catch {
      setError("Failed to connect to the payment gateway.");
      setLoading(false);
    }
  }

  // ── Success State ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="space-y-6 text-center animate-float-up py-2">
        {/* Celebratory Checkmark Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 ring-8 ring-emerald-500/5">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-fg">
            You&apos;re Registered!
          </h3>
          <p className="mt-1 text-sm text-muted">
            We&apos;ve reserved your spot. A confirmation has been emailed to you.
          </p>
        </div>

        {/* Ticket Pass Stub Card */}
        <div className="rounded-2xl border border-line bg-ink-2 p-5 text-left shadow-soft">
          <div className="flex items-center justify-between border-b border-line/70 pb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
              TXF Event Pass
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
              Confirmed
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-faint">Pass Code</p>
              <p className="font-mono text-2xl font-bold tracking-wider text-fg mt-0.5 truncate">
                {success}
              </p>
              {attendeeName && (
                <p className="text-xs text-muted mt-1 truncate">{attendeeName}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(success);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="shrink-0 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg hover:border-brand hover:text-brand transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {copied ? (
                <>
                  <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Icon name="share" className="h-3.5 w-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-1">
          {nextSteps?.calendar && (
            <a
              href={googleCalUrl(nextSteps.calendar)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3 text-sm font-semibold text-fg hover:border-brand hover:text-brand transition-colors shadow-sm"
            >
              <Icon name="calendar" className="h-4 w-4" />
              Add to Google Calendar
            </a>
          )}

          {onClose && (
            <button
              type="button"
              onClick={() => {
                onClose();
                router.refresh();
              }}
              className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-soft transition-all"
            >
              Done · Return to Event
            </button>
          )}
        </div>

        {!userProfile?.email && (
          <p className="mx-auto text-xs text-muted max-w-sm pt-2">
            <a href="/login?mode=signup" className="text-brand-soft underline font-semibold">
              Create a free account
            </a>{" "}
            with this email to store your ticket, earn points at check-in, and join the community.
          </p>
        )}
      </div>
    );
  }

  // ── Waitlist State ─────────────────────────────────────────────────────────
  if (waitlisted) {
    return (
      <div className="space-y-6 text-center animate-float-up py-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 ring-8 ring-amber-500/5">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-fg">
            You&apos;re on the Waitlist
          </h3>
          <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
            This event is currently full. We&apos;ll notify you immediately via email the moment a spot opens up.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={() => {
              onClose();
              router.refresh();
            }}
            className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-soft transition-all"
          >
            Done
          </button>
        )}
      </div>
    );
  }

  // ── Form State ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {isPaid && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {waitlistMode && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-medium text-amber-700">
            <svg className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>
              {isPaid
                ? "This event is sold out. Join the waitlist — if a place frees up, you are first in line to claim it."
                : "This event is at capacity. Join the waitlist and we will notify you as soon as a spot opens."}
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-medium text-red-600">
            <svg className="h-4 w-4 shrink-0 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Ticket Tiers */}
        {!waitlistMode && sellable.length > 1 && (
          <fieldset className="space-y-2">
            <legend className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted">
              Select Your Pass
            </legend>
            <div className="space-y-2">
              {sellable.map((t) => {
                const selected = t.id === tier?.id;
                return (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                      selected
                        ? "border-brand bg-brand/5 ring-1 ring-brand/30 shadow-sm"
                        : "border-line bg-surface hover:border-brand/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ticket_type"
                      value={t.id}
                      checked={selected}
                      onChange={() => {
                        setTierId(t.id);
                        setQty(1);
                      }}
                      className="mt-1 accent-[var(--color-brand)] h-4 w-4"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-fg">{t.name}</span>
                        <span className="text-sm font-bold text-fg">{t.priceLabel}</span>
                      </span>
                      {t.description && (
                        <span className="mt-0.5 block text-xs text-muted">
                          {t.description}
                        </span>
                      )}
                      <span className="mt-1 block text-[11px] font-medium text-amber-600">
                        {t.available} {t.available === 1 ? "seat" : "seats"} left
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Quantity */}
        {!waitlistMode && tier && maxQty > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
            <div>
              <span className="block text-sm font-semibold text-fg">Quantity</span>
              <span className="text-xs text-faint">Max {maxQty} per order</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-fg hover:bg-ink-2 disabled:opacity-30 transition-colors"
              >
                −
              </button>
              <span className="min-w-6 text-center text-sm font-bold text-fg">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                aria-label="Increase quantity"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-fg hover:bg-ink-2 disabled:opacity-30 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Order Summary (for paid tickets) */}
        {!waitlistMode && tier && tier.priceAmount > 0 && (
          <div className="rounded-xl border border-line bg-ink-2 p-3.5 text-sm">
            <div className="flex items-center justify-between text-muted">
              <span>
                {tier.name} × {qty}
              </span>
              <span className="font-medium text-fg">{inr(subtotal)}</span>
            </div>
            {memberNote && (
              <div className="mt-1.5 flex items-center justify-between text-xs text-host-soft font-medium">
                <span>{memberNote}</span>
                <span>applied</span>
              </div>
            )}
            <div className="mt-2.5 flex items-center justify-between border-t border-line/70 pt-2 font-bold text-fg">
              <span>Total Amount</span>
              <span className="font-display text-base text-brand">{inr(subtotal)}</span>
            </div>
          </div>
        )}

        {/* Attendee Details */}
        <div className="space-y-3 pt-1">
          <div>
            <label htmlFor="reg_attendee_name" className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Full Name <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              id="reg_attendee_name"
              name="attendee_name"
              required
              placeholder="e.g. Alex Johnson"
              defaultValue={userProfile?.full_name || ""}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-faint outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>

          <div>
            <label htmlFor="reg_attendee_email" className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Email Address <span className="text-brand">*</span>
            </label>
            <input
              type="email"
              id="reg_attendee_email"
              name="attendee_email"
              required
              placeholder="alex@example.com"
              defaultValue={userProfile?.email || ""}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-faint outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            <span className="mt-1 block text-[11px] text-faint">
              Your ticket and joining details will be sent here.
            </span>
          </div>

          <div>
            <label htmlFor="reg_attendee_phone" className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              id="reg_attendee_phone"
              name="attendee_phone"
              required
              placeholder="+91 98765 43210"
              defaultValue={userProfile?.phone || ""}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-faint outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
        </div>

        {/* Organiser's Custom Questions */}
        {!waitlistMode && questions.length > 0 && (
          <div className="space-y-3 pt-1 border-t border-line/60">
            <p className="text-xs font-bold uppercase tracking-wider text-muted pt-1">
              Organizer Questions
            </p>
            {questions.map((q) => {
              const id = `q_${q.id}`;
              const cls =
                "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-faint outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15";
              return (
                <div key={q.id}>
                  <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-muted">
                    {q.label}
                    {q.required ? (
                      <span className="text-brand"> *</span>
                    ) : (
                      <span className="text-faint font-normal"> (Optional)</span>
                    )}
                  </label>
                  {q.type === "textarea" ? (
                    <textarea
                      id={id}
                      name={id}
                      rows={3}
                      required={q.required}
                      className={`${cls} resize-none`}
                    />
                  ) : q.type === "select" ? (
                    <select id={id} name={id} required={q.required} defaultValue="" className={cls}>
                      <option value="" disabled>
                        Choose…
                      </option>
                      {(q.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" id={id} name={id} required={q.required} className={cls} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Promo Code */}
        {isPaid && !waitlistMode && (
          <div className="pt-1">
            <label htmlFor="reg_promo_code" className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Promo Code <span className="text-faint font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              id="reg_promo_code"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder="e.g. EARLYBIRD20"
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm uppercase tracking-wider text-fg placeholder:text-faint outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-[0_8px_25px_-6px_rgba(255,90,31,0.5)] transition-all hover:bg-brand-soft hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{waitlistMode ? "Joining waitlist…" : isPaid ? "Connecting payment…" : "Registering…"}</span>
              </span>
            ) : (
              <span>
                {waitlistMode
                  ? "Join the Waitlist"
                  : isPaid
                    ? `Proceed to Pay · ${subtotal > 0 ? inr(subtotal) : (priceLabel || "Pay")}`
                    : "Confirm Registration · Free"}
              </span>
            )}
          </button>
        </div>

        {/* Reassurance Notes */}
        <div className="space-y-2 pt-1 text-center">
          {isPaid && memberNote && (
            <p className="text-xs font-semibold text-host-soft flex items-center justify-center gap-1">
              ✓ {memberNote}
            </p>
          )}

          {isPaid && !waitlistMode && !memberNote && (
            <p className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs text-muted">
              💡 Members save <strong className="text-fg font-semibold">up to 50%</strong> on passes.{" "}
              <a href="/membership" className="font-semibold text-brand-soft hover:underline">
                View membership
              </a>
            </p>
          )}

          <p className="text-[11px] text-faint">
            By registering, you agree to the Code of Conduct and Terms of Service.
          </p>
        </div>
      </form>
    </div>
  );
}
