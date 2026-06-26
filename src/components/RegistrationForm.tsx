"use client";

import { useState } from "react";
import { registerForEvent } from "@/app/events/[slug]/actions";
import { Icon } from "./Icon";

interface RegistrationFormProps {
  eventId: string;
  isFull: boolean;
  userProfile?: {
    full_name?: string;
    email?: string;
    phone?: string;
  } | null;
}

export function RegistrationForm({ eventId, isFull, userProfile }: RegistrationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const res = await registerForEvent(eventId, formData);

    if (res.error) {
      setError(res.error);
    } else if (res.success && res.ticketCode) {
      setSuccess(res.ticketCode);
    }

    setLoading(false);
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
            {loading ? "Registering..." : "Confirm Registration"}
          </button>
          
          <p className="text-center text-xs text-faint mt-3">
            By registering, you agree to our Code of Conduct and Terms of Service.
          </p>
        </form>
      )}
    </div>
  );
}
