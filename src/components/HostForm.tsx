"use client";

import { useState } from "react";
import { eventCategories } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

/**
 * Turn two 24-hour inputs into the display string the rest of the app uses,
 * e.g. "10:00 AM – 1:00 PM IST".
 */
function formatTimeRange(start: string, end: string): string | null {
  const to12h = (v: string) => {
    const [hStr, m] = v.split(":");
    const h = Number(hStr);
    if (Number.isNaN(h)) return null;
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m ?? "00"} ${suffix}`;
  };
  const a = start ? to12h(start) : null;
  const b = end ? to12h(end) : null;
  if (!a && !b) return null;
  if (a && b) return `${a} – ${b} IST`;
  return `${a ?? b} IST`;
}

export function HostForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "Meetup",
    date: "",
    city: "",
    venue: "",
    email: "",
    phone: "",
    description: "",
    priceType: "Free" as "Free" | "Paid",
    priceRupees: "",
    capacity: "100",
    tags: "",
    startTime: "10:00",
    endTime: "13:00",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const paise =
      formData.priceType === "Paid"
        ? Math.round(parseFloat(formData.priceRupees || "0") * 100)
        : 0;
    if (formData.priceType === "Paid" && paise <= 0) {
      setSubmitting(false);
      setError("Enter a ticket price for a paid event.");
      return;
    }

    const core = {
      title: formData.title,
      category: formData.category,
      date: formData.date,
      city: formData.city,
      venue: formData.venue,
      organizer_email: formData.email,
      description: formData.description,
      organizer_id: user?.id ?? null,
      price_type: formData.priceType,
      price_amount: paise,
      capacity: Math.max(1, parseInt(formData.capacity || "100", 10)),
    };

    const extras = {
      organizer_phone: formData.phone.trim(),
      // Same normalisation as the admin form, so tags stay one set.
      tags: Array.from(
        new Set(
          formData.tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
        ),
      ),
      time: formatTimeRange(formData.startTime, formData.endTime),
    };

    // tags, time and organizer_phone arrive with the event-discovery section of
    // schema.sql. If it hasn't been applied, submit without them rather than
    // failing the whole submission — losing them is better than losing the event.
    let { error: insertError } = await supabase
      .from("host_submissions")
      .insert({ ...core, ...extras });

    if (insertError) {
      ({ error: insertError } = await supabase.from("host_submissions").insert(core));
    }

    setSubmitting(false);

    if (insertError) {
      setError("Something went wrong submitting your event. Please try again.");
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mt-10 rounded-3xl border border-host/30 bg-host/5 p-8 text-center animate-float-up shadow-soft">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-host/15 text-host-soft">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-6 font-display text-2xl font-bold text-fg">
          Event submitted successfully!
        </h3>
        <p className="mt-2 text-sm text-muted max-w-md mx-auto">
          Thank you for proposing <strong>{formData.title}</strong>. Our team will review your application and get back to you within 1-2 business days.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => {
              setFormData({
                title: "",
                category: "Meetup",
                tags: "",
                startTime: "10:00",
                endTime: "13:00",
                date: "",
                city: "",
                venue: "",
                email: "",
                phone: "",
                description: "",
                priceType: "Free",
                priceRupees: "",
                capacity: "100",
              });
              setSubmitted(false);
            }}
            className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium text-fg hover:bg-ink-2 transition-all duration-200"
          >
            Submit another event
          </button>
          <a
            href="/events"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-soft hover:-translate-y-0.5 transition-all duration-200 shadow-md"
          >
            Browse live events
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 space-y-5 rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-soft"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">
            Event title
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Next.js Hands-on Workshop"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">
            Category
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {eventCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">
            Date
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div>
          <label htmlFor="host-start" className="mb-1.5 block text-sm font-medium text-fg">
            Time
          </label>
          <div className="flex items-center gap-2">
            <input
              id="host-start"
              type="time"
              required
              aria-label="Start time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full rounded-xl border border-line bg-ink px-3 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <span className="shrink-0 text-sm text-faint">to</span>
            <input
              type="time"
              required
              aria-label="End time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full rounded-xl border border-line bg-ink px-3 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">
            City
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Chennai"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          Venue
        </label>
        <input
          type="text"
          required
          placeholder="e.g., IIT Madras Research Park"
          value={formData.venue}
          onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">
            Ticketing
          </label>
          <select
            required
            value={formData.priceType}
            onChange={(e) =>
              setFormData({ ...formData, priceType: e.target.value as "Free" | "Paid" })
            }
            className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="Free">Free entry</option>
            <option value="Paid">Paid tickets</option>
          </select>
        </div>
        {formData.priceType === "Paid" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              Ticket price (₹)
            </label>
            <input
              type="number"
              min="1"
              required
              placeholder="499"
              value={formData.priceRupees}
              onChange={(e) => setFormData({ ...formData, priceRupees: e.target.value })}
              className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">
            Capacity
          </label>
          <input
            type="number"
            min="1"
            required
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          Organizer email
        </label>
        <input
          type="email"
          required
          placeholder="e.g., organizer@techxfluence.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          Phone contact
        </label>
        <input
          type="tel"
          required
          inputMode="tel"
          placeholder="e.g., +91 98765 43210"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">
          Event description
        </label>
        <textarea
          rows={4}
          required
          placeholder="What's the event about, who's it for, and what should attendees expect?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div>
        <label htmlFor="host-tags" className="mb-1.5 block text-sm font-medium text-fg">
          Tags <span className="text-faint">(optional)</span>
        </label>
        <input
          id="host-tags"
          placeholder="react, beginner, students welcome"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <p className="mt-1.5 text-xs text-faint">
          Comma separated. These help people find your event on the events page.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full cursor-pointer rounded-full bg-host px-7 py-3.5 text-base font-medium text-white hover:bg-host-soft hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_30px_-8px_rgba(22,163,74,0.4)] disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {submitting ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
