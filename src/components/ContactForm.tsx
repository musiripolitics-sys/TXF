"use client";

import { useState } from "react";

const topics = [
  "General enquiry",
  "Host an event",
  "Partnership / Sponsorship",
  "Membership",
  "Press / Media",
];

/**
 * Contact form — front-end only. On submit it shows a confirmation.
 * Wire to an API route / email service when the backend exists.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="rounded-2xl border border-host/40 bg-host/10 p-8 text-center">
        <p className="font-display text-xl font-semibold text-fg">
          Thanks — message received!
        </p>
        <p className="mt-2 text-sm text-muted">
          Our team will get back to you within 1–2 working days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" placeholder="Your name" />
        <Field label="Email" type="email" placeholder="you@email.com" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          What&apos;s this about?
        </label>
        <select
          required
          defaultValue=""
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="" disabled>
            Select a topic
          </option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          Message
        </label>
        <textarea
          required
          rows={5}
          placeholder="Tell us how we can help…"
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-brand px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-soft"
      >
        Send message
      </button>
    </form>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
}: {
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fg">{label}</label>
      <input
        type={type}
        required
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}
