"use client";

import { useState, useEffect } from "react";
import { eventCategories, categoryTheme, events as defaultEvents, type TXFEvent, type EventCategory } from "@/lib/data";

type HostMessage = {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  city: string;
  venue: string;
  email: string;
  description: string;
  submittedAt: string;
  status: "pending" | "approved" | "declined";
};

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"submissions" | "create" | "manage">("submissions");
  
  // Database states
  const [hostMessages, setHostMessages] = useState<HostMessage[]>([]);
  const [customEvents, setCustomEvents] = useState<TXFEvent[]>([]);

  // Create Event Form state
  const [eventForm, setEventForm] = useState({
    title: "",
    category: "Meetup" as EventCategory,
    date: "",
    time: "10:00 AM – 1:00 PM IST",
    city: "",
    venue: "",
    address: "",
    price: "Free" as "Free" | "Paid",
    priceLabel: "Free",
    blurb: "",
    about: "",
    capacity: 100,
  });

  const [speakers, setSpeakers] = useState<{ name: string; role: string }[]>([
    { name: "", role: "" },
  ]);

  // Load from localstorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const messages = localStorage.getItem("txf_host_messages");
      if (messages) {
        setHostMessages(JSON.parse(messages));
      }
      const events = localStorage.getItem("txf_custom_events");
      if (events) {
        setCustomEvents(JSON.parse(events));
      }
    }
  }, []);

  // Sync back to localstorage
  const saveHostMessages = (newMessages: HostMessage[]) => {
    setHostMessages(newMessages);
    localStorage.setItem("txf_host_messages", JSON.stringify(newMessages));
  };

  const saveCustomEvents = (newEvents: TXFEvent[]) => {
    setCustomEvents(newEvents);
    localStorage.setItem("txf_custom_events", JSON.stringify(newEvents));
  };

  // Auto-generate initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "TXF";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Format date to label (e.g. 2026-07-12 -> Jul 12, 2026)
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Handles approving a host proposal
  const handleApproveProposal = (message: HostMessage) => {
    const slug = `${message.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).substring(2, 6)}`;
    
    const newEvent: TXFEvent = {
      slug,
      title: message.title,
      category: message.category,
      date: message.date,
      dateLabel: formatDateLabel(message.date),
      time: "10:00 AM – 1:00 PM IST",
      city: message.city,
      venue: message.venue,
      address: `${message.venue}, ${message.city}`,
      price: "Free",
      priceLabel: "Free",
      blurb: message.description.substring(0, 100) + (message.description.length > 100 ? "..." : ""),
      about: message.description,
      capacity: 100,
      spotsLeft: 100,
      speakers: [],
    };

    // Update message status
    const updatedMessages = hostMessages.map((msg) =>
      msg.id === message.id ? { ...msg, status: "approved" as const } : msg
    );
    saveHostMessages(updatedMessages);

    // Save event
    const updatedEvents = [newEvent, ...customEvents];
    saveCustomEvents(updatedEvents);

    // Move to manage events tab
    setActiveTab("manage");
  };

  // Handles declining a host proposal
  const handleDeclineProposal = (id: string) => {
    const updatedMessages = hostMessages.map((msg) =>
      msg.id === id ? { ...msg, status: "declined" as const } : msg
    );
    saveHostMessages(updatedMessages);
  };

  // Handles deleting a custom event
  const handleDeleteCustomEvent = (slug: string) => {
    const updatedEvents = customEvents.filter((ev) => ev.slug !== slug);
    saveCustomEvents(updatedEvents);
  };

  // Handles speaker form edits
  const handleAddSpeaker = () => {
    setSpeakers([...speakers, { name: "", role: "" }]);
  };

  const handleRemoveSpeaker = (index: number) => {
    setSpeakers(speakers.filter((_, i) => i !== index));
  };

  const handleSpeakerChange = (index: number, field: "name" | "role", value: string) => {
    const updated = [...speakers];
    updated[index][field] = value;
    setSpeakers(updated);
  };

  // Handle direct event form submit
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();

    const slug = `${eventForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).substring(2, 6)}`;
    
    // Process speakers
    const processedSpeakers = speakers
      .filter((s) => s.name.trim() !== "")
      .map((s) => ({
        name: s.name,
        role: s.role || "Speaker",
        initials: getInitials(s.name),
      }));

    const newEvent: TXFEvent = {
      slug,
      title: eventForm.title,
      category: eventForm.category,
      date: eventForm.date,
      dateLabel: formatDateLabel(eventForm.date),
      time: eventForm.time,
      city: eventForm.city,
      venue: eventForm.venue,
      address: eventForm.address || `${eventForm.venue}, ${eventForm.city}`,
      price: eventForm.price,
      priceLabel: eventForm.price === "Free" ? "Free" : eventForm.priceLabel,
      blurb: eventForm.blurb,
      about: eventForm.about,
      capacity: Number(eventForm.capacity),
      spotsLeft: Number(eventForm.capacity),
      speakers: processedSpeakers,
    };

    const updatedEvents = [newEvent, ...customEvents];
    saveCustomEvents(updatedEvents);

    // Reset Form
    setEventForm({
      title: "",
      category: "Meetup",
      date: "",
      time: "10:00 AM – 1:00 PM IST",
      city: "",
      venue: "",
      address: "",
      price: "Free",
      priceLabel: "Free",
      blurb: "",
      about: "",
      capacity: 100,
    });
    setSpeakers([{ name: "", role: "" }]);

    // Move to manage events tab
    setActiveTab("manage");
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 text-center text-muted">
        Loading Admin Dashboard...
      </div>
    );
  }

  return (
    <>
      <header className="border-b border-line bg-ink-2">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
            Admin Portal
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-fg">
            TXF Console
          </h1>
          <p className="mt-2 text-sm text-muted">
            Manage community event requests, approve submissions, and schedule upcoming meets.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        {/* Navigation Tabs */}
        <div className="flex border-b border-line mb-8 overflow-x-auto gap-8">
          <button
            onClick={() => setActiveTab("submissions")}
            className={`pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "submissions"
                ? "border-brand text-brand-soft"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            Host Submissions ({hostMessages.filter((m) => m.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "create"
                ? "border-brand text-brand-soft"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            Create Event
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "manage"
                ? "border-brand text-brand-soft"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            Manage Events ({defaultEvents.length + customEvents.length})
          </button>
        </div>

        {/* Tab 1: Submissions */}
        {activeTab === "submissions" && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-fg">
              Event Proposals from Hosts
            </h2>
            {hostMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
                <p className="text-muted text-sm">No submissions received yet.</p>
                <p className="text-xs text-faint mt-1">
                  Proposals submitted through the &quot;Host an Event&quot; page will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {hostMessages.map((msg) => {
                  const theme = categoryTheme[msg.category] || { from: "#333", to: "#000", icon: "mic", label: "EVENT" };
                  return (
                    <div
                      key={msg.id}
                      className="relative rounded-2xl border border-line bg-surface p-6 shadow-soft flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                            style={{
                              background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                            }}
                          >
                            {msg.category.toUpperCase()}
                          </span>
                          <span className="text-xs text-faint">
                            {new Date(msg.submittedAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="font-display text-xl font-bold text-fg mb-1">
                          {msg.title}
                        </h3>
                        <div className="text-xs text-muted space-y-1 mb-4">
                          <p>
                            <strong>Date:</strong> {formatDateLabel(msg.date)}
                          </p>
                          <p>
                            <strong>Location:</strong> {msg.venue}, {msg.city}
                          </p>
                          <p>
                            <strong>Email:</strong>{" "}
                            <a
                              href={`mailto:${msg.email}`}
                              className="text-brand-soft underline hover:text-brand"
                            >
                              {msg.email}
                            </a>
                          </p>
                        </div>

                        <p className="text-sm text-muted bg-ink-2 p-3.5 rounded-xl mb-4 line-clamp-4">
                          {msg.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        {msg.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleApproveProposal(msg)}
                              className="flex-1 rounded-full bg-host hover:bg-host-soft text-white py-2 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Approve &amp; Publish
                            </button>
                            <button
                              onClick={() => handleDeclineProposal(msg.id)}
                              className="rounded-full border border-line bg-surface text-muted hover:text-fg hover:border-fg px-4 py-2 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        ) : (
                          <div className="w-full text-center py-2">
                            <span
                              className={`text-xs font-semibold rounded-full px-4 py-1.5 ${
                                msg.status === "approved"
                                  ? "bg-host/15 text-host-soft"
                                  : "bg-red-500/10 text-red-600"
                              }`}
                            >
                              {msg.status.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create Event Form */}
        {activeTab === "create" && (
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl font-bold text-fg mb-6">
              Publish New Event
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-6 bg-surface border border-line p-6 sm:p-8 rounded-3xl shadow-soft">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="AI Meetup Chennai"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">
                    Category
                  </label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value as EventCategory })}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {eventCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
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
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">
                    Time (Label)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="10:00 AM – 1:00 PM IST"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
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
                    placeholder="Chennai"
                    value={eventForm.city}
                    onChange={(e) => setEventForm({ ...eventForm, city: e.target.value })}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="IIT Madras Research Park"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Kanagam Road, Taramani, Chennai 600113"
                  value={eventForm.address}
                  onChange={(e) => setEventForm({ ...eventForm, address: e.target.value })}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">
                    Price Type
                  </label>
                  <select
                    value={eventForm.price}
                    onChange={(e) => setEventForm({ ...eventForm, price: e.target.value as "Free" | "Paid" })}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="Free">Free</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">
                    Price Label
                  </label>
                  <input
                    type="text"
                    required
                    disabled={eventForm.price === "Free"}
                    placeholder={eventForm.price === "Free" ? "Free" : "₹299"}
                    value={eventForm.price === "Free" ? "Free" : eventForm.priceLabel}
                    onChange={(e) => setEventForm({ ...eventForm, priceLabel: e.target.value })}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">
                    Capacity
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={eventForm.capacity}
                    onChange={(e) => setEventForm({ ...eventForm, capacity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">
                  Blurb (Short Summary)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Builders shipping with LLMs swap notes over coffee."
                  value={eventForm.blurb}
                  onChange={(e) => setEventForm({ ...eventForm, blurb: e.target.value })}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">
                  About (Full Description)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide details about the schedule, requirements, and key highlights..."
                  value={eventForm.about}
                  onChange={(e) => setEventForm({ ...eventForm, about: e.target.value })}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              {/* Speakers Management */}
              <div className="border-t border-line pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-fg">Speakers</h3>
                  <button
                    type="button"
                    onClick={handleAddSpeaker}
                    className="text-xs font-semibold text-brand-soft hover:text-brand cursor-pointer"
                  >
                    + Add Speaker
                  </button>
                </div>
                
                <div className="space-y-4">
                  {speakers.map((speaker, index) => (
                    <div key={index} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Speaker Name
                        </label>
                        <input
                          type="text"
                          placeholder="Nikhil Varma"
                          value={speaker.name}
                          onChange={(e) => handleSpeakerChange(index, "name", e.target.value)}
                          className="w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-xs text-fg focus:border-brand focus:outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Role/Bio
                        </label>
                        <input
                          type="text"
                          placeholder="ML Engineer, Freshworks"
                          value={speaker.role}
                          onChange={(e) => handleSpeakerChange(index, "role", e.target.value)}
                          className="w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-xs text-fg focus:border-brand focus:outline-none"
                        />
                      </div>
                      {speakers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSpeaker(index)}
                          className="text-xs text-red-500 hover:text-red-700 pb-3 cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full cursor-pointer rounded-full bg-brand px-7 py-3.5 text-base font-medium text-white hover:bg-brand-soft hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_30px_-8px_rgba(255,90,31,0.4)]"
              >
                Create &amp; Publish Event
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Manage Events */}
        {activeTab === "manage" && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-fg">
              All Active Events
            </h2>
            <div className="border border-line rounded-2xl bg-surface overflow-hidden shadow-soft">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-ink-2 text-xs font-bold text-muted uppercase">
                    <th className="p-4">Event Details</th>
                    <th className="p-4 hidden sm:table-cell">Category</th>
                    <th className="p-4 hidden sm:table-cell">City</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Source</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {/* Custom Events */}
                  {customEvents.map((ev) => (
                    <tr key={ev.slug} className="hover:bg-ink/30 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-fg">{ev.title}</p>
                        <p className="text-xs text-faint mt-0.5">{formatDateLabel(ev.date)} · {ev.time}</p>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className="text-xs border border-line bg-surface rounded-full px-2.5 py-0.5 text-muted">
                          {ev.category}
                        </span>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-muted">{ev.city}</td>
                      <td className="p-4 text-muted font-medium">{ev.priceLabel}</td>
                      <td className="p-4">
                        <span className="text-xs bg-brand/10 text-brand-soft rounded-full px-2.5 py-0.5 font-semibold">
                          Custom
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteCustomEvent(ev.slug)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Default (System) Events */}
                  {defaultEvents.map((ev) => (
                    <tr key={ev.slug} className="hover:bg-ink/30 transition-colors opacity-80">
                      <td className="p-4">
                        <p className="font-semibold text-fg">{ev.title}</p>
                        <p className="text-xs text-faint mt-0.5">{ev.dateLabel} · {ev.time}</p>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className="text-xs border border-line bg-surface rounded-full px-2.5 py-0.5 text-muted">
                          {ev.category}
                        </span>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-muted">{ev.city}</td>
                      <td className="p-4 text-muted font-medium">{ev.priceLabel}</td>
                      <td className="p-4">
                        <span className="text-xs bg-ink-2 text-faint rounded-full px-2.5 py-0.5">
                          System
                        </span>
                      </td>
                      <td className="p-4 text-right text-xs text-faint italic">
                        Read Only
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
