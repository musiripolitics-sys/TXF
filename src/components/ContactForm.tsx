"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const topics = [
  "General enquiry",
  "Host an event",
  "Partnership / Sponsorship",
  "Membership",
  "Press / Media",
  "Careers / Job Application",
] as const;

/**
 * Contact form — writes to Supabase `contact_messages` (anon insert allowed by RLS).
 */
export function ContactForm() {
  const searchParams = useSearchParams();
  const role = searchParams?.get("role");

  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "",
    message: "",
  });

  useEffect(() => {
    if (role) {
      setForm((prev) => ({
        ...prev,
        topic: "Careers / Job Application",
        message: `I am interested in applying for the ${role} position.`,
      }));
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("contact_messages").insert({
      name: form.name,
      email: form.email,
      topic: form.topic,
      message: form.message,
    });

    setSubmitting(false);

    if (insertError) {
      setError("Couldn't send your message. Please try again.");
      return;
    }

    setSent(true);
  };

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
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Name"
          placeholder="Your name"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
        />
        <Field
          label="Email"
          type="email"
          placeholder="you@email.com"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          What&apos;s this about?
        </label>
        <select
          required
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
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
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Tell us how we can help…"
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-brand px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-soft disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fg">{label}</label>
      <input
        type={type}
        required
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}
