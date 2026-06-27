"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  registrations: Attendee[];
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
          "id,slug,title,date_label,spots_left,capacity, registrations(id,attendee_name,attendee_email,status,ticket_code)",
        )
        .eq("host_id", hostId)
        .order("date", { ascending: true }),
    ]);
    setSubmissions((subs as Submission[]) ?? []);
    setEvents((evs as unknown as HostEvent[]) ?? []);
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
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
            Host Portal
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-fg">
            My Events
          </h1>
          <p className="mt-2 text-sm text-muted">
            Track your submissions, resubmit rejected ones, and manage attendees
            for your live events.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/host"
              className="inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-soft"
            >
              + Propose a new event
            </Link>
            <Link
              href="/host/checkin"
              className="inline-block rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium text-fg hover:border-brand hover:text-brand"
            >
              Door check-in →
            </Link>
          </div>
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
