"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { registerForEvent, joinWaitlist } from "@/app/events/[slug]/actions";
import { Icon } from "./Icon";
import type { TicketType, EventQuestion } from "@/lib/data";

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
}: RegistrationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  // Full events take waitlist joins. Free: auto-promoted when a seat frees.
  // Paid: first in line gets notified to buy the freed seat.
  const waitlistMode = isFull;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const attendee = {
      attendee_name: (formData.get("attendee_name") as string)?.trim(),
      attendee_email: (formData.get("attendee_email") as string)?.trim(),
      attendee_phone: (formData.get("attendee_phone") as string)?.trim() || "",
    };

    if (waitlistMode) {
      setLoading(true);
      const res = await joinWaitlist(eventId, formData);
      if (res.error) setError(res.error);
      else if (res.success) setWaitlisted(true);
      setLoading(false);
      return;
    }

    if (isPaid) {
      await handlePaid(attendee);
      return;
    }

    // Free event — register directly via the server action.
    setLoading(true);
    const res = await registerForEvent(eventId, formData, tier?.id, qty);
    if (res.error) setError(res.error);
    else if (res.success && res.ticketCode) setSuccess(res.ticketCode);
    setLoading(false);
  }

  async function handlePaid(attendee: {
    attendee_name: string;
    attendee_email: string;
    attendee_phone: string;
  }) {
    // Paid tickets require an account so the payment is attached to a user.
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
          ...attendee,
        }),
      });
      const order = await res.json();
      if (!res.ok || order.error) {
        setError(order.error || "Failed to start payment.");
        setLoading(false);
        return;
      }

      // A 100%-discounted order is already fulfilled — no gateway needed.
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
        description: "Event ticket",
        order_id: order.orderId,
        prefill: {
          name: attendee.attendee_name,
          email: attendee.attendee_email,
          contact: attendee.attendee_phone,
        },
        theme: { color: "#ff5a1f" },
        handler: async (response: any) => {
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

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch {
      setError("Failed to connect to the payment gateway.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center mt-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-brand">
          <Icon name="check" className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold text-fg">You&apos;re registered!</h3>
        <p className="mt-2 text-muted">We&apos;ve saved your spot. See you there!</p>
        <div className="mt-6 inline-block rounded-lg bg-surface border border-line px-4 py-2 font-mono text-lg font-bold text-fg tracking-widest shadow-inner">
          {success}
        </div>
        <p className="mt-2 text-xs text-faint">Your ticket code</p>
        {!userProfile?.email && (
          <p className="mx-auto mt-5 max-w-xs rounded-xl border border-line bg-surface p-3 text-xs text-muted">
            <a
              href="/login?mode=signup"
              className="font-medium text-brand-soft underline"
            >
              Create a free account
            </a>{" "}
            with this email to keep your ticket, earn points at check-in and
            join the attendee group after the event.
          </p>
        )}
      </div>
    );
  }

  if (waitlisted) {
    return (
      <div className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <h3 className="font-display text-2xl font-bold text-fg">
          You&apos;re on the waitlist
        </h3>
        <p className="mt-2 text-muted">
          This event is full, but we&apos;ll email you the moment a spot opens up.
        </p>
      </div>
    );
  }

  return (
    <div id="register">
      {isPaid && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
          {waitlistMode && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">
              {isPaid
                ? "Sold out. Join the waitlist — if a seat frees up, you're first in line to buy it."
                : "This event is full. Join the waitlist and we'll email you if a spot opens up."}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Ticket tiers — only shown when the event offers a real choice. */}
          {!waitlistMode && sellable.length > 1 && (
            <fieldset className="space-y-2">
              <legend className="mb-1 block text-sm font-medium text-muted">
                Select ticket
              </legend>
              {sellable.map((t) => (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    t.id === tier?.id
                      ? "border-brand bg-brand/5"
                      : "border-line hover:border-brand/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="ticket_type"
                    value={t.id}
                    checked={t.id === tier?.id}
                    onChange={() => {
                      setTierId(t.id);
                      setQty(1);
                    }}
                    className="mt-1 accent-[var(--color-brand)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-fg">{t.name}</span>
                      <span className="text-sm font-bold text-fg">{t.priceLabel}</span>
                    </span>
                    {t.description && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {t.description}
                      </span>
                    )}
                    <span className="mt-0.5 block text-xs text-faint">
                      {t.available} left
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {/* Quantity */}
          {!waitlistMode && tier && maxQty > 1 && (
            <div>
              <span className="mb-1 block text-sm font-medium text-muted">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                  className="h-9 w-9 rounded-full border border-line text-lg leading-none text-fg disabled:opacity-40"
                >
                  −
                </button>
                <span className="min-w-8 text-center text-sm font-semibold text-fg">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  aria-label="Increase quantity"
                  className="h-9 w-9 rounded-full border border-line text-lg leading-none text-fg disabled:opacity-40"
                >
                  +
                </button>
                <span className="text-xs text-faint">max {maxQty}</span>
              </div>
            </div>
          )}

          {/* Order summary — only meaningful for paid tiers */}
          {!waitlistMode && tier && tier.priceAmount > 0 && (
            <div className="rounded-xl border border-line bg-ink-2 p-3 text-sm">
              <div className="flex items-center justify-between text-muted">
                <span>
                  {tier.name} × {qty}
                </span>
                <span>{inr(subtotal)}</span>
              </div>
              {memberNote && (
                <div className="mt-1 flex items-center justify-between text-xs text-host-soft">
                  <span>{memberNote}</span>
                  <span>applied at checkout</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 font-semibold text-fg">
                <span>Total</span>
                <span>{inr(subtotal)}</span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="attendee_name" className="block text-sm font-medium text-muted mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="attendee_name"
              name="attendee_name"
              required
              defaultValue={userProfile?.full_name || ""}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="attendee_email" className="block text-sm font-medium text-muted mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="attendee_email"
              name="attendee_email"
              required
              defaultValue={userProfile?.email || ""}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="attendee_phone" className="block text-sm font-medium text-muted mb-1">
              Phone Number <span className="text-faint">(Optional)</span>
            </label>
            <input
              type="tel"
              id="attendee_phone"
              name="attendee_phone"
              defaultValue={userProfile?.phone || ""}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-brand"
            />
          </div>

          {/* Organiser's custom questions */}
          {!waitlistMode &&
            questions.map((q) => {
              const id = `q_${q.id}`;
              const cls =
                "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-brand";
              return (
                <div key={q.id}>
                  <label htmlFor={id} className="mb-1 block text-sm font-medium text-muted">
                    {q.label}
                    {!q.required && <span className="text-faint"> (Optional)</span>}
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

          {isPaid && !waitlistMode && (
            <div>
              <label htmlFor="promo_code" className="block text-sm font-medium text-muted mb-1">
                Promo code <span className="text-faint">(Optional)</span>
              </label>
              <input
                type="text"
                id="promo_code"
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="e.g. LAUNCH20"
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm uppercase tracking-wide text-fg outline-none transition-colors focus:border-brand"
              />
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-50 px-7 py-3.5 text-base bg-brand text-white shadow-[0_8px_30px_-8px_rgba(255,106,26,0.7)] hover:bg-brand-soft hover:-translate-y-0.5 focus-visible:ring-brand w-full"
            disabled={loading}
          >
            {loading
              ? waitlistMode
                ? "Joining…"
                : isPaid
                  ? "Processing…"
                  : "Registering..."
              : waitlistMode
                ? "Join the waitlist"
                : isPaid
                  ? `Buy ticket · ${priceLabel || "Pay"}`
                  : "Confirm Registration"}
          </button>

          {isPaid && memberNote && (
            <p className="text-center text-xs font-medium text-host-soft">
              ✓ {memberNote}
            </p>
          )}

          {/* Membership upsell — the checkout is the moment the discount is
              most tangible. Shown only to non-members buying a ticket. */}
          {isPaid && !waitlistMode && !memberNote && (
            <p className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-center text-xs text-muted">
              💡 Members save <strong className="text-fg">up to 50%</strong> on
              every ticket.{" "}
              <a href="/membership" className="font-medium text-brand-soft underline">
                See plans
              </a>
            </p>
          )}

          <p className="text-center text-xs text-faint mt-3">
            By registering, you agree to our Code of Conduct and Terms of Service.
          </p>
        </form>
    </div>
  );
}
