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

  const openEdit = (ev: HostEvent) => {
    if (editFor === ev.id) return setEditFor(null);
    setEditFor(ev.id);
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
          <Link
            href="/host"
            className="inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-soft"
          >
            + Propose a new event
          </Link>
        </div>
      </header>

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
