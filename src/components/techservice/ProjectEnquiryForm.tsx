"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { acknowledgeContact, contactWithinLimit } from "@/app/actions/public-email";
import { budgets, services, timelines } from "./data";

/**
 * Project enquiry for /Techservice.
 *
 * Writes to the same `contact_messages` table as the contact page, so it
 * lands in the same admin inbox and sends the same acknowledgement email.
 * The table has no columns for services, budget or timeline, so those are
 * written into the message as a short brief.
 */
export function ProjectEnquiryForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    platform: "",
    budget: "",
    timeline: "",
    details: "",
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const toggle = (s: string) =>
    setPicked((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (picked.length === 0) {
      setError("Pick at least one service so we know where to start.");
      return;
    }
    setSubmitting(true);

    if (!(await contactWithinLimit())) {
      setSubmitting(false);
      setError("That's a lot of messages from one place. Please try again later.");
      return;
    }

    const header = [
      "[TXF Tech Services — project enquiry]",
      form.company.trim() && `Company: ${form.company.trim()}`,
      `Services: ${picked.join(", ")}`,
      form.platform.trim() && `Preferred platform: ${form.platform.trim()}`,
      form.budget && `Budget: ${form.budget}`,
      form.timeline && `Timeline: ${form.timeline}`,
    ].filter(Boolean);
    const brief = `${header.join("\n")}\n\n${form.details.trim()}`;

    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase
      .from("contact_messages")
      .insert({ name: form.name, email: form.email, topic: "General enquiry", message: brief })
      .select("id")
      .maybeSingle();

    setSubmitting(false);
    if (insertError) {
      setError(
        insertError.code === "23514"
          ? "You've already sent us a few messages. Give us a little while to reply."
          : "Couldn't send your enquiry. Please try again, or email hello@techxfluence.com.",
      );
      return;
    }
    if (inserted?.id) void acknowledgeContact(inserted.id as string);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-[20px] border border-line bg-ink p-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-2xl text-white" aria-hidden>
          ✓
        </span>
        <p className="mt-5 font-display text-2xl font-bold text-fg">Thanks — your brief is in.</p>
        <p className="mt-2 max-w-sm text-muted">
          We&rsquo;ll read it and reply within 1–2 working days to set up a short discovery call.
        </p>
      </div>
    );
  }

  const input =
    "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[20px] border border-line bg-ink p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Label text="Name">
          <input required className={input} placeholder="Your name" autoComplete="name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Label>
        <Label text="Work email">
          <input required type="email" className={input} placeholder="you@company.com" autoComplete="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Label>
      </div>

      <Label text="Company" optional>
        <input className={input} placeholder="Company or project name" autoComplete="organization"
          value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
      </Label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-fg">What do you need?</legend>
        <div className="flex flex-wrap gap-2">
          {[...services.map((s) => s.title), "Something else"].map((title) => {
            const on = picked.includes(title);
            return (
              <button
                key={title}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(title)}
                className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  on ? "border-brand bg-brand text-white" : "border-line bg-surface text-muted hover:border-brand hover:text-fg"
                }`}
              >
                {title}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Label text="Preferred platform" optional>
        <input className={input} placeholder="e.g. WordPress, Shopify, custom build — or “not sure, recommend one”"
          value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
      </Label>

      <div className="grid gap-5 sm:grid-cols-2">
        <Label text="Budget" optional>
          <select className={input} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}>
            <option value="">Select a range</option>
            {budgets.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Label>
        <Label text="Timeline" optional>
          <select className={input} value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })}>
            <option value="">When do you need it?</option>
            {timelines.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Label>
      </div>

      <Label text="Tell us about the project">
        <textarea required rows={5} maxLength={3000} className={input}
          placeholder="What are you building, who is it for, and what would success look like?"
          value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
      </Label>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-brand px-6 py-3.5 text-base font-medium text-white shadow-[0_8px_30px_-8px_rgba(255,106,26,0.7)] transition-all hover:-translate-y-0.5 hover:bg-brand-soft disabled:translate-y-0 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send project brief →"}
      </button>
      <p className="text-center text-xs text-faint">No spam, no sales sequences — a real reply from the team.</p>
    </form>
  );
}

function Label({ text, optional, children }: { text: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">
        {text}
        {optional && <span className="ml-1 font-normal text-faint">(optional)</span>}
      </span>
      {children}
    </label>
  );
}
