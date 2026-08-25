"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { messageAttendees } from "@/app/host/dashboard/actions";
import { toast } from "./Toast";

type Earnings = {
  gross: number;
  platform_fee: number;
  net: number;
  paid_out: number;
  balance: number;
};

const inr = (paise: number) => `₹${((paise ?? 0) / 100).toLocaleString("en-IN")}`;

type Submission = {
  id: string;
  title: string;
  category: string;
  date: string;
  city: string;
  venue: string;
  status: "pending" | "approved" | "declined";
  submitted_at: string;
};

type Attendee = {
  id: string;
  attendee_name: string;
  attendee_email: string;
  status: string;
  ticket_code: string | null;
};

type HostEvent = {
  id: string;
  slug: string;
  title: string;
  date_label: string | null;
  spots_left: number;
  capacity: number;
  status: string;
  time: string | null;
  venue: string | null;
  address: string | null;
  blurb: string | null;
  about: string | null;
  registrations: Attendee[];
};

type EventEdits = {
  title: string;
  time: string;
  venue: string;
  address: string;
  blurb: string;
  about: string;
};

const statusStyle: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  approved: "bg-host/15 text-host-soft",
  declined: "bg-red-500/10 text-red-600",
};

export function HostDashboard({ hostId }: { hostId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [composeFor, setComposeFor] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  /** Download this event's attendee list as a CSV. */
  const exportCsv = (ev: HostEvent) => {
    const rows = [
      ["Name", "Email", "Ticket code", "Status"],
      ...(ev.registrations ?? []).map((a) => [
        a.attendee_name,
        a.attendee_email,
        (a.ticket_code ?? "").toUpperCase(),
        a.status,
      ]),
    ];
    // Quote every field so commas in names can't break the columns.
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees-${ev.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [editFor, setEditFor] = useState<string | null>(null);
  const [edits, setEdits] = useState<EventEdits | null>(null);

  // ── Create a new event (approved hosts publish their own) ──
  type NewTier = { name: string; price: number; capacity: number };
  const blankNew = {
    title: "",
    category: "Meetup",
    date: "",
    time: "10:00 AM – 1:00 PM IST",
    city: "",
    venue: "",
    address: "",
    blurb: "",
    about: "",
  };
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...blankNew });
  const [newTiers, setNewTiers] = useState<NewTier[]>([
    { name: "General Admission", price: 0, capacity: 100 },
  ]);

  const slugify = (t: string) =>
    `${t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const tiers = newTiers.filter((t) => t.name.trim() && t.capacity > 0);
    const list = tiers.length ? tiers : [{ name: "General Admission", price: 0, capacity: 100 }];
    const totalCapacity = list.reduce((s, t) => s + Number(t.capacity), 0);
    const cheapest = Math.min(...list.map((t) => Math.round((t.price || 0) * 100)));
    const isFree = cheapest === 0;

    setBusyId("create");
    const { data: ev, error } = await supabase
      .from("events")
      .insert({
        slug: slugify(form.title),
        title: form.title.trim(),
        category: form.category,
        date: form.date,
        date_label: form.date
          ? new Date(form.date).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })
          : null,
        time: form.time,
        city: form.city.trim(),
        venue: form.venue.trim(),
        address: form.address.trim() || `${form.venue}, ${form.city}`,
        price_type: isFree ? "Free" : "Paid",
        price_label: isFree ? "Free" : `₹${(cheapest / 100).toLocaleString("en-IN")}`,
        price_amount: cheapest,
        blurb: form.blurb.trim(),
        about: form.about.trim(),
        capacity: totalCapacity,
        spots_left: totalCapacity,
        // Created as a draft — the host publishes when they're ready.
        status: "draft",
        source: "host_submission",
        host_id: hostId,
      })
      .select("id")
      .single();

    if (error || !ev) {
      setBusyId(null);
      return toast("Couldn't create the event. " + (error?.message ?? ""), "error");
    }

    await supabase.from("ticket_types").insert(
      list.map((t, i) => ({
        event_id: ev.id,
        name: t.name.trim(),
        price_amount: Math.round((t.price || 0) * 100),
        capacity: Number(t.capacity),
        sort_order: i,
      })),
    );

    setBusyId(null);
    toast("Event created as a draft — publish it when you're ready.", "success");
    setForm({ ...blankNew });
    setNewTiers([{ name: "General Admission", price: 0, capacity: 100 }]);
    setShowCreate(false);
    await refresh();
  };

  type EventStats = {
    revenue: number;
    tickets: number;
    checked_in: number;
    waitlisted: number;
    last7: number;
    tiers: { name: string; sold: number; capacity: number; price: number }[];
  };
  const [stats, setStats] = useState<Record<string, EventStats>>({});
  const [statsFor, setStatsFor] = useState<string | null>(null);

  const toggleStats = async (eventId: string) => {
    if (statsFor === eventId) return setStatsFor(null);
    setStatsFor(eventId);
    if (stats[eventId]) return; // already loaded
    const { data, error } = await supabase.rpc("get_event_stats", {
      p_event_id: eventId,
    });
    if (error) return toast("Couldn't load stats. " + error.message, "error");
    setStats((s) => ({ ...s, [eventId]: data as EventStats }));
  };

  type Question = { id: string; label: string; type: string; required: boolean };
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQ, setNewQ] = useState({ label: "", type: "text", required: false });

  const loadQuestions = async (eventId: string) => {
    const { data } = await supabase
      .from("event_questions")
      .select("id,label,type,required")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true });
    setQuestions((data as Question[]) ?? []);
  };

  const addQuestion = async (eventId: string) => {
    const label = newQ.label.trim();
    if (!label) return;
    const { error } = await supabase.from("event_questions").insert({
      event_id: eventId,
      label,
      type: newQ.type,
      required: newQ.required,
      sort_order: questions.length,
    });
    if (error) return toast("Couldn't add question. " + error.message, "error");
    setNewQ({ label: "", type: "text", required: false });
    await loadQuestions(eventId);
    toast("Question added.", "success");
  };

  const removeQuestion = async (eventId: string, id: string) => {
    await supabase.from("event_questions").delete().eq("id", id);
    await loadQuestions(eventId);
  };

  const openEdit = (ev: HostEvent) => {
    if (editFor === ev.id) return setEditFor(null);
    setEditFor(ev.id);
    loadQuestions(ev.id);
    setEdits({
      title: ev.title ?? "",
      time: ev.time ?? "",
      venue: ev.venue ?? "",
      address: ev.address ?? "",
      blurb: ev.blurb ?? "",
      about: ev.about ?? "",
    });
  };

  const saveEdit = async (eventId: string) => {
    if (!edits) return;
    setBusyId(eventId + "edit");
    const { error } = await supabase
      .from("events")
      .update({
        title: edits.title.trim(),
        time: edits.time.trim() || null,
        venue: edits.venue.trim() || null,
        address: edits.address.trim() || null,
        blurb: edits.blurb.trim() || null,
        about: edits.about.trim() || null,
      })
      .eq("id", eventId);
    setBusyId(null);
    if (error) return toast("Couldn't save. " + error.message, "error");
    toast("Event updated.", "success");
    setEditFor(null);
    await refresh();
  };

  /** Take an event off the public listing, or put it back. */
  const togglePublished = async (ev: HostEvent) => {
    const next = ev.status === "published" ? "draft" : "published";
    setBusyId(ev.id + "status");
    const { error } = await supabase
      .from("events")
      .update({ status: next })
      .eq("id", ev.id);
    setBusyId(null);
    if (error) return toast("Couldn't update status. " + error.message, "error");
    toast(next === "published" ? "Event is live again." : "Event unpublished.", "success");
    await refresh();
  };

  const sendMessage = async (eventId: string) => {
    setSending(true);
    const res = await messageAttendees(eventId, message);
    setSending(false);
    if (res.error) return toast(res.error, "error");
    toast(`Message sent to ${res.sent} attendee${res.sent === 1 ? "" : "s"}.`, "success");
    setMessage("");
    setComposeFor(null);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: subs }, { data: evs }] = await Promise.all([
      supabase
        .from("host_submissions")
        .select("id,title,category,date,city,venue,status,submitted_at")
        .eq("organizer_id", hostId)
        .order("submitted_at", { ascending: false }),
      supabase
        .from("events")
        .select(
          "id,slug,title,date_label,spots_left,capacity,status,time,venue,address,blurb,about, registrations(id,attendee_name,attendee_email,status,ticket_code)",
        )
        .eq("host_id", hostId)
        .order("date", { ascending: true }),
    ]);
    setSubmissions((subs as Submission[]) ?? []);
    setEvents((evs as unknown as HostEvent[]) ?? []);

    // Earnings are tolerant — a DB without the payouts migration just hides it.
    try {
      const { data: e } = await supabase.rpc("get_host_earnings");
      if (e) setEarnings(e as Earnings);
    } catch {
      /* not available yet */
    }
    setLoading(false);
  }, [supabase, hostId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resubmit = async (id: string) => {
    setBusyId(id);
    await supabase
      .from("host_submissions")
      .update({ status: "pending" })
      .eq("id", id);
    setBusyId(null);
    await refresh();
  };

  const toggleAttended = async (reg: Attendee) => {
    setBusyId(reg.id);
    const next = reg.status === "attended" ? "registered" : "attended";
    await supabase
      .from("registrations")
      .update({
        status: next,
        checked_in_at: next === "attended" ? new Date().toISOString() : null,
      })
      .eq("id", reg.id);
    setBusyId(null);
    await refresh();
  };

  return (
    <>
      <header className="border-b border-line bg-ink-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-5 py-8 sm:px-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-fg">
              My Events
            </h1>
            <p className="mt-1 text-sm text-muted">
              Track your submissions, resubmit rejected ones, and manage
              attendees for your live events.
            </p>
          </div>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-soft"
          >
            {showCreate ? "Close" : "+ Create an event"}
          </button>
        </div>
      </header>

      {showCreate && (
        <div className="border-b border-line bg-ink-2">
          <form
            onSubmit={createEvent}
            className="mx-auto max-w-6xl space-y-4 px-5 py-8 sm:px-8"
          >
            <div>
              <h2 className="font-display text-xl font-bold text-fg">New event</h2>
              <p className="mt-1 text-sm text-muted">
                Saved as a draft — nothing goes live until you hit Publish.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" required>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="AI Builders Meetup"
                  className={fieldCls}
                />
              </Field>
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={fieldCls}
                >
                  {["Meetup","Workshop","Webinar","Hackathon","Conference","Networking","Product Launch"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date" required>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={fieldCls}
                />
              </Field>
              <Field label="Time (label)">
                <input
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={fieldCls}
                />
              </Field>
              <Field label="City" required>
                <input
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Chennai (or Online)"
                  className={fieldCls}
                />
              </Field>
              <Field label="Venue" required>
                <input
                  required
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  className={fieldCls}
                />
              </Field>
            </div>

            <Field label="Address">
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={fieldCls}
              />
            </Field>
            <Field label="Short summary" required>
              <input
                required
                value={form.blurb}
                onChange={(e) => setForm({ ...form, blurb: e.target.value })}
                className={fieldCls}
              />
            </Field>
            <Field label="Full description" required>
              <textarea
                required
                rows={4}
                value={form.about}
                onChange={(e) => setForm({ ...form, about: e.target.value })}
                className={`${fieldCls} resize-none`}
              />
            </Field>

            {/* Ticket tiers */}
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-fg">Ticket types</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Price in ₹ (0 = free). Capacity totals across tiers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewTiers((r) => [...r, { name: "", price: 0, capacity: 50 }])}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-fg hover:border-brand hover:text-brand"
                >
                  + Add tier
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {newTiers.map((t, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                    <input
                      value={t.name}
                      onChange={(e) =>
                        setNewTiers((r) => r.map((x, ix) => (ix === i ? { ...x, name: e.target.value } : x)))
                      }
                      placeholder="Early Bird"
                      className={fieldCls}
                    />
                    <input
                      type="number"
                      min={0}
                      value={t.price}
                      onChange={(e) =>
                        setNewTiers((r) => r.map((x, ix) => (ix === i ? { ...x, price: Number(e.target.value) } : x)))
                      }
                      className={fieldCls}
                    />
                    <input
                      type="number"
                      min={1}
                      value={t.capacity}
                      onChange={(e) =>
                        setNewTiers((r) => r.map((x, ix) => (ix === i ? { ...x, capacity: Number(e.target.value) } : x)))
                      }
                      className={fieldCls}
                    />
                    <button
                      type="button"
                      onClick={() => setNewTiers((r) => (r.length > 1 ? r.filter((_, ix) => ix !== i) : r))}
                      disabled={newTiers.length === 1}
                      className="rounded-full border border-line px-3 text-xs text-muted hover:border-red-500/40 hover:text-red-500 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-muted hover:text-fg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === "create"}
                className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-soft disabled:opacity-50"
              >
                {busyId === "create" ? "Creating…" : "Create draft"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-12 px-5 py-10 sm:px-8">
        {loading && <p className="text-center text-sm text-muted">Loading…</p>}

        {/* Submissions */}
        {!loading && (
          <section>
            <h2 className="mb-5 font-display text-2xl font-bold text-fg">
              My Submissions
            </h2>
            {submissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
                <p className="text-sm text-muted">
                  You haven&apos;t submitted any events yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-ink-2 text-xs font-bold uppercase text-muted">
                      <th className="p-4">Event</th>
                      <th className="hidden p-4 sm:table-cell">Where</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-sm">
                    {submissions.map((s) => (
                      <tr key={s.id} className="hover:bg-ink/30">
                        <td className="p-4">
                          <p className="font-semibold text-fg">{s.title}</p>
                          <p className="text-xs text-faint">
                            {s.category} ·{" "}
                            {new Date(s.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })}
                          </p>
                        </td>
                        <td className="hidden p-4 text-muted sm:table-cell">
                          {s.venue}, {s.city}
                        </td>
                        <td className="p-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              statusStyle[s.status] ?? ""
                            }`}
                          >
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {s.status === "declined" ? (
                            <button
                              onClick={() => resubmit(s.id)}
                              disabled={busyId === s.id}
                              className="text-xs font-semibold text-brand-soft hover:text-brand disabled:opacity-60"
                            >
                              {busyId === s.id ? "…" : "Resubmit"}
                            </button>
                          ) : (
                            <span className="text-xs text-faint">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Earnings */}
        {!loading && earnings && earnings.gross > 0 && (
          <section>
            <h2 className="mb-5 font-display text-2xl font-bold text-fg">Earnings</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { label: "Ticket sales", value: inr(earnings.gross), sub: "gross" },
                {
                  label: "Platform fee",
                  value: `−${inr(earnings.platform_fee)}`,
                  sub: "10%",
                },
                { label: "Paid out", value: inr(earnings.paid_out), sub: "to date" },
                {
                  label: "Balance due",
                  value: inr(earnings.balance),
                  sub: "next payout",
                  highlight: true,
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className={`rounded-2xl border bg-surface p-5 shadow-soft ${
                    c.highlight ? "border-brand/40" : "border-line"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-faint">
                    {c.label}
                  </p>
                  <p
                    className={`mt-2 font-display text-2xl font-bold ${
                      c.highlight ? "text-brand-soft" : "text-fg"
                    }`}
                  >
                    {c.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Live events + attendees */}
        {!loading && (
          <section>
            <h2 className="mb-5 font-display text-2xl font-bold text-fg">
              Live Events & Attendees
            </h2>
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
                <p className="text-sm text-muted">
                  No live events yet. Once an admin approves a submission, it
                  shows up here with its attendee list.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {events.map((ev) => {
                  const attendees = ev.registrations ?? [];
                  const checkedIn = attendees.filter(
                    (a) => a.status === "attended",
                  ).length;
                  return (
                    <div
                      key={ev.id}
                      className="rounded-2xl border border-line bg-surface shadow-soft"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
                        <div>
                          <Link
                            href={`/events/${ev.slug}`}
                            className="font-display text-lg font-bold text-fg hover:text-brand-soft"
                          >
                            {ev.title}
                          </Link>
                          <p className="text-xs text-faint">{ev.date_label}</p>
                        </div>
                        <div className="text-right text-xs text-muted">
                          <p>
                            <strong className="text-fg">{attendees.length}</strong>{" "}
                            registered · {checkedIn} checked in
                          </p>
                          <p>
                            {ev.spots_left}/{ev.capacity} spots left
                          </p>
                        </div>
                      </div>

                      {/* Organiser actions */}
                      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
                        <button
                          onClick={() => exportCsv(ev)}
                          disabled={attendees.length === 0}
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-fg hover:border-brand hover:text-brand disabled:opacity-40"
                        >
                          Export CSV
                        </button>
                        <button
                          onClick={() => {
                            setComposeFor(composeFor === ev.id ? null : ev.id);
                            setMessage("");
                          }}
                          disabled={attendees.length === 0}
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-fg hover:border-brand hover:text-brand disabled:opacity-40"
                        >
                          Message attendees
                        </button>
                        <button
                          onClick={() => toggleStats(ev.id)}
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-fg hover:border-brand hover:text-brand"
                        >
                          Stats
                        </button>
                        <button
                          onClick={() => openEdit(ev)}
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-fg hover:border-brand hover:text-brand"
                        >
                          Edit details
                        </button>
                        <button
                          onClick={() => togglePublished(ev)}
                          disabled={busyId === ev.id + "status"}
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-fg hover:border-brand hover:text-brand disabled:opacity-40"
                        >
                          {ev.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <Link
                          href="/host/checkin"
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-fg hover:border-brand hover:text-brand"
                        >
                          Door check-in →
                        </Link>
                        {ev.status !== "published" && (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
                            Not live
                          </span>
                        )}
                      </div>

                      {statsFor === ev.id && stats[ev.id] && (
                        <div className="border-b border-line bg-ink-2 p-5">
                          <div className="grid gap-3 sm:grid-cols-4">
                            {[
                              { label: "Revenue", value: inr(stats[ev.id].revenue) },
                              { label: "Tickets sold", value: String(stats[ev.id].tickets) },
                              {
                                label: "Checked in",
                                value: `${stats[ev.id].checked_in}${
                                  stats[ev.id].tickets
                                    ? ` · ${Math.round(
                                        (stats[ev.id].checked_in / stats[ev.id].tickets) * 100,
                                      )}%`
                                    : ""
                                }`,
                              },
                              { label: "Last 7 days", value: `+${stats[ev.id].last7}` },
                            ].map((c) => (
                              <div
                                key={c.label}
                                className="rounded-xl border border-line bg-surface p-4"
                              >
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                                  {c.label}
                                </p>
                                <p className="mt-1 font-display text-xl font-bold text-fg">
                                  {c.value}
                                </p>
                              </div>
                            ))}
                          </div>

                          {stats[ev.id].tiers.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <p className="text-xs font-semibold text-fg">By ticket type</p>
                              {stats[ev.id].tiers.map((t) => {
                                const pct = t.capacity
                                  ? Math.min(100, Math.round((t.sold / t.capacity) * 100))
                                  : 0;
                                return (
                                  <div key={t.name}>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-fg">
                                        {t.name}{" "}
                                        <span className="text-faint">
                                          {t.price > 0 ? inr(t.price) : "Free"}
                                        </span>
                                      </span>
                                      <span className="text-muted">
                                        {t.sold}/{t.capacity}
                                      </span>
                                    </div>
                                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-2">
                                      <div
                                        className="h-full rounded-full bg-brand"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {stats[ev.id].waitlisted > 0 && (
                            <p className="mt-3 text-xs text-amber-600">
                              {stats[ev.id].waitlisted} on the waitlist
                            </p>
                          )}
                        </div>
                      )}

                      {editFor === ev.id && edits && (
                        <div className="space-y-3 border-b border-line bg-ink-2 p-5">
                          {(
                            [
                              ["title", "Title"],
                              ["time", "Time (label)"],
                              ["venue", "Venue"],
                              ["address", "Address"],
                              ["blurb", "Short summary"],
                            ] as const
                          ).map(([key, label]) => (
                            <label key={key} className="block">
                              <span className="mb-1 block text-[11px] font-medium text-muted">
                                {label}
                              </span>
                              <input
                                type="text"
                                value={edits[key]}
                                onChange={(e) =>
                                  setEdits({ ...edits, [key]: e.target.value })
                                }
                                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
                              />
                            </label>
                          ))}
                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium text-muted">
                              Full description
                            </span>
                            <textarea
                              rows={4}
                              value={edits.about}
                              onChange={(e) => setEdits({ ...edits, about: e.target.value })}
                              className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
                            />
                          </label>
                          {/* Custom registration questions */}
                          <div className="rounded-xl border border-line bg-surface p-4">
                            <p className="text-sm font-semibold text-fg">
                              Registration questions
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              Extra fields attendees fill in when they register
                              (dietary needs, company, t-shirt size…).
                            </p>

                            {questions.length > 0 && (
                              <ul className="mt-3 space-y-2">
                                {questions.map((q) => (
                                  <li
                                    key={q.id}
                                    className="flex items-center justify-between gap-3 rounded-lg bg-ink-2 px-3 py-2"
                                  >
                                    <span className="min-w-0 text-xs text-fg">
                                      {q.label}
                                      <span className="ml-2 text-faint">
                                        {q.type}
                                        {q.required ? " · required" : ""}
                                      </span>
                                    </span>
                                    <button
                                      onClick={() => removeQuestion(ev.id, q.id)}
                                      className="shrink-0 text-[11px] font-medium text-red-500 hover:underline"
                                    >
                                      Remove
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="mt-3 flex flex-wrap items-end gap-2">
                              <input
                                type="text"
                                value={newQ.label}
                                onChange={(e) => setNewQ({ ...newQ, label: e.target.value })}
                                placeholder="e.g. Dietary requirements"
                                className="min-w-40 flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-xs text-fg placeholder:text-faint focus:border-brand focus:outline-none"
                              />
                              <select
                                value={newQ.type}
                                onChange={(e) => setNewQ({ ...newQ, type: e.target.value })}
                                className="rounded-lg border border-line bg-ink px-3 py-2 text-xs text-fg focus:border-brand focus:outline-none"
                              >
                                <option value="text">Short text</option>
                                <option value="textarea">Long text</option>
                              </select>
                              <label className="flex items-center gap-1.5 text-xs text-muted">
                                <input
                                  type="checkbox"
                                  checked={newQ.required}
                                  onChange={(e) =>
                                    setNewQ({ ...newQ, required: e.target.checked })
                                  }
                                  className="accent-[var(--color-brand)]"
                                />
                                Required
                              </label>
                              <button
                                onClick={() => addQuestion(ev.id)}
                                disabled={!newQ.label.trim()}
                                className="rounded-full border border-line px-3 py-2 text-xs font-medium text-fg hover:border-brand hover:text-brand disabled:opacity-40"
                              >
                                Add question
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditFor(null)}
                              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-muted hover:text-fg"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(ev.id)}
                              disabled={busyId === ev.id + "edit" || !edits.title.trim()}
                              className="rounded-full bg-brand px-5 py-2 text-xs font-medium text-white hover:bg-brand-soft disabled:opacity-50"
                            >
                              {busyId === ev.id + "edit" ? "Saving…" : "Save changes"}
                            </button>
                          </div>
                        </div>
                      )}

                      {composeFor === ev.id && (
                        <div className="border-b border-line bg-ink-2 p-5">
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder={`Send an update to everyone registered for ${ev.title}…`}
                            className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none"
                          />
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-faint">
                              Goes to {attendees.length} attendee
                              {attendees.length === 1 ? "" : "s"} by email
                            </span>
                            <button
                              onClick={() => sendMessage(ev.id)}
                              disabled={sending || message.trim().length < 5}
                              className="rounded-full bg-brand px-5 py-2 text-xs font-medium text-white hover:bg-brand-soft disabled:opacity-50"
                            >
                              {sending ? "Sending…" : "Send update"}
                            </button>
                          </div>
                        </div>
                      )}

                      {attendees.length === 0 ? (
                        <p className="p-5 text-sm text-muted">
                          No registrations yet.
                        </p>
                      ) : (
                        <table className="w-full border-collapse text-left text-sm">
                          <tbody className="divide-y divide-line">
                            {attendees.map((a) => (
                              <tr key={a.id}>
                                <td className="p-4">
                                  <p className="font-medium text-fg">
                                    {a.attendee_name}
                                  </p>
                                  <p className="text-xs text-faint">
                                    {a.attendee_email}
                                  </p>
                                </td>
                                <td className="p-4 text-xs text-faint">
                                  {a.ticket_code}
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => toggleAttended(a)}
                                    disabled={busyId === a.id}
                                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                                      a.status === "attended"
                                        ? "bg-host/15 text-host-soft"
                                        : "border border-line text-muted hover:text-fg"
                                    }`}
                                  >
                                    {a.status === "attended"
                                      ? "✓ Checked in"
                                      : "Mark attended"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}

const fieldCls =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">
        {label}
        {required && <span className="text-brand"> *</span>}
      </span>
      {children}
    </label>
  );
}
