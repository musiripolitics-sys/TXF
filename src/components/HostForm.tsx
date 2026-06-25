"use client";

import { useState } from "react";
import { eventCategories } from "@/lib/data";

export function HostForm() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "Meetup",
    date: "",
    city: "",
    venue: "",
    email: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newMessage = {
      id: Math.random().toString(36).substring(2, 9),
      ...formData,
      submittedAt: new Date().toISOString(),
      status: "pending" as const,
    };

    if (typeof window !== "undefined") {
      const existing = localStorage.getItem("txf_host_messages");
      const messages = existing ? JSON.parse(existing) : [];
      messages.unshift(newMessage);
      localStorage.setItem("txf_host_messages", JSON.stringify(messages));
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
                date: "",
                city: "",
                venue: "",
                email: "",
                description: "",
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

      <button
        type="submit"
        className="w-full cursor-pointer rounded-full bg-host px-7 py-3.5 text-base font-medium text-white hover:bg-host-soft hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_30px_-8px_rgba(22,163,74,0.4)]"
      >
        Submit for review
      </button>
    </form>
  );
}
