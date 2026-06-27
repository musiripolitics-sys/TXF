"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { registerForEvent } from "@/app/events/[slug]/actions";
import { Icon } from "./Icon";

interface RegistrationFormProps {
  eventId: string;
  isFull: boolean;
  isPaid?: boolean;
  priceLabel?: string;
  memberNote?: string;
  userProfile?: {
    full_name?: string;
    email?: string;
    phone?: string;
  } | null;
}

export function RegistrationForm({
  eventId,
  isFull,
  isPaid = false,
  priceLabel,
  memberNote,
  userProfile,
}: RegistrationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    if (isPaid) {
      await handlePaid(attendee);
      return;
    }

    // Free event — register directly via the server action.
    setLoading(true);
    const res = await registerForEvent(eventId, formData);
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
        body: JSON.stringify({ eventId }),
      });
      const order = await res.json();
      if (!res.ok || order.error) {
        setError(order.error || "Failed to start payment.");
        setLoading(false);
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
      </div>
    );
  }

  return (
    <div id="register">
      {isPaid && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}
      {isFull ? (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-500">
          This event has reached its maximum capacity.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              {error}
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

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-50 px-7 py-3.5 text-base bg-brand text-white shadow-[0_8px_30px_-8px_rgba(255,106,26,0.7)] hover:bg-brand-soft hover:-translate-y-0.5 focus-visible:ring-brand w-full"
            disabled={loading}
          >
            {loading
              ? isPaid
                ? "Processing…"
                : "Registering..."
              : isPaid
                ? `Buy ticket · ${priceLabel || "Pay"}`
                : "Confirm Registration"}
          </button>

          {isPaid && memberNote && (
            <p className="text-center text-xs font-medium text-host-soft">
              ✓ {memberNote}
            </p>
          )}

          <p className="text-center text-xs text-faint mt-3">
            By registering, you agree to our Code of Conduct and Terms of Service.
          </p>
        </form>
      )}
    </div>
  );
}
