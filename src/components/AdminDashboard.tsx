"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { eventCategories, categoryTheme, type EventCategory } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

type Submission = {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  city: string;
  venue: string;
  organizer_email: string;
  description: string;
  status: "pending" | "approved" | "declined";
  submitted_at: string;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  date: string;
  date_label: string | null;
  time: string | null;
  city: string;
  price_label: string | null;
  source: "system" | "custom" | "host_submission";
};

type AppUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  city: string | null;
  primary_role: AppRole;
  points: number;
  created_at: string;
};

type AppRole =
  | "community_member"
  | "event_attendee"
  | "event_host"
  | "partner_sponsor"
  | "admin";

const ALL_ROLES: AppRole[] = [
  "community_member",
  "event_attendee",
  "event_host",
  "partner_sponsor",
  "admin",
];

const roleLabel = (r: AppRole) =>
  r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatDateLabel = (d: string) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "TXF";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const slugify = (title: string) =>
  `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.random()
    .toString(36)
    .substring(2, 6)}`;

export function AdminDashboard({
  adminEmail,
  adminId,
}: {
  adminEmail: string;
  adminId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<
    "submissions" | "create" | "manage" | "users"
  >("submissions");
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: subs }, { data: evs }, { data: usrs }, { data: roleRows }] =
      await Promise.all([
        supabase
          .from("host_submissions")
          .select("id,title,category,date,city,venue,organizer_email,description,status,submitted_at")
          .order("submitted_at", { ascending: false }),
        supabase
          .from("events")
          .select("id,slug,title,category,date,date_label,time,city,price_label,source")
          .order("date", { ascending: true }),
        supabase
          .from("users")
          .select("id,email,full_name,city,primary_role,points,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);

    setSubmissions((subs as Submission[]) ?? []);
    setEvents((evs as EventRow[]) ?? []);
    setUsers((usrs as AppUser[]) ?? []);

    const map: Record<string, AppRole[]> = {};
    for (const r of (roleRows as { user_id: string; role: AppRole }[]) ?? []) {
      (map[r.user_id] ??= []).push(r.role);
    }
    setRolesByUser(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const approve = async (s: Submission) => {
    setBusyId(s.id);
    const { data: inserted, error } = await supabase
      .from("events")
      .insert({
        slug: slugify(s.title),
        title: s.title,
        category: s.category,
        date: s.date,
        date_label: formatDateLabel(s.date),
        time: "10:00 AM – 1:00 PM IST",
        city: s.city,
        venue: s.venue,
        address: `${s.venue}, ${s.city}`,
        price_type: "Free",
        price_label: "Free",
        blurb: s.description.slice(0, 100) + (s.description.length > 100 ? "…" : ""),
        about: s.description,
        capacity: 100,
        spots_left: 100,
        status: "published",
        source: "host_submission",
        submission_id: s.id,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!error && inserted) {
      await supabase
        .from("host_submissions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          published_event_id: inserted.id,
        })
        .eq("id", s.id);
    }
    setBusyId(null);
    await refresh();
    setActiveTab("manage");
  };

  const decline = async (id: string) => {
    setBusyId(id);
    await supabase
      .from("host_submissions")
      .update({ status: "declined", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    await refresh();
  };

  const deleteEvent = async (id: string) => {
    setBusyId(id);
    await supabase.from("events").delete().eq("id", id);
    setBusyId(null);
    await refresh();
  };

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    // Prevent an admin from removing their own admin role (avoids lockout).
    if (role === "admin" && userId === adminId && has) {
      alert("You can't remove your own admin role.");
      return;
    }
    setBusyId(userId + role);
    if (has) {
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }
    setBusyId(null);
    await refresh();
  };

  const changePrimaryRole = async (userId: string, role: AppRole) => {
    setBusyId(userId + "primary");
    await supabase.from("users").update({ primary_role: role }).eq("id", userId);
    setBusyId(null);
    await refresh();
  };

  const addSpeaker = () => setSpeakers([...speakers, { name: "", role: "" }]);
  const removeSpeaker = (i: number) =>
    setSpeakers(speakers.filter((_, idx) => idx !== i));
  const changeSpeaker = (i: number, field: "name" | "role", value: string) => {
    const next = [...speakers];
    next[i][field] = value;
    setSpeakers(next);
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId("create");

    const { data: inserted, error } = await supabase
      .from("events")
      .insert({
        slug: slugify(eventForm.title),
        title: eventForm.title,
        category: eventForm.category,
        date: eventForm.date,
        date_label: formatDateLabel(eventForm.date),
        time: eventForm.time,
        city: eventForm.city,
        venue: eventForm.venue,
        address: eventForm.address || `${eventForm.venue}, ${eventForm.city}`,
        price_type: eventForm.price,
        price_label: eventForm.price === "Free" ? "Free" : eventForm.priceLabel,
        blurb: eventForm.blurb,
        about: eventForm.about,
        capacity: Number(eventForm.capacity),
        spots_left: Number(eventForm.capacity),
        status: "published",
        source: "custom",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!error && inserted) {
      const valid = speakers.filter((s) => s.name.trim());
      if (valid.length) {
        const { data: spk } = await supabase
          .from("speakers")
          .insert(
            valid.map((s) => ({
              name: s.name,
              role: s.role || "Speaker",
              initials: getInitials(s.name),
            })),
          )
          .select("id");
        if (spk?.length) {
          await supabase.from("event_speakers").insert(
            spk.map((row, idx) => ({
              event_id: inserted.id,
              speaker_id: row.id,
              sort_order: idx,
            })),
          );
        }
      }
    }

    setBusyId(null);
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
    await refresh();
    setActiveTab("manage");
  };

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <>
      <header className="border-b border-line bg-ink-2">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-5 py-12 sm:px-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-soft">
              Admin Portal
            </span>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-fg">
              TXF Console
            </h1>
            <p className="mt-2 text-sm text-muted">
              Manage event requests, approve submissions, and publish events.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-faint">{adminEmail}</p>
            <button
              onClick={signOut}
              className="mt-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-medium text-muted hover:text-fg"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex gap-8 overflow-x-auto border-b border-line">
          {(["submissions", "create", "manage", "users"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 pb-4 text-sm font-semibold tracking-wide transition-all ${
                activeTab === tab
                  ? "border-brand text-brand-soft"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {tab === "submissions" && `Host Submissions (${pendingCount})`}
              {tab === "create" && "Create Event"}
              {tab === "manage" && `Manage Events (${events.length})`}
              {tab === "users" && `Users (${users.length})`}
            </button>
          ))}
        </div>

        {loading && (
          <p className="py-12 text-center text-sm text-muted">Loading…</p>
        )}

        {/* Submissions */}
        {!loading && activeTab === "submissions" && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-fg">
              Event Proposals from Hosts
            </h2>
            {submissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
                <p className="text-sm text-muted">No submissions received yet.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {submissions.map((s) => {
                  const theme =
                    categoryTheme[s.category] ?? {
                      from: "#333",
                      to: "#000",
                    };
                  return (
                    <div
                      key={s.id}
                      className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-6 shadow-soft"
                    >
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                            style={{
                              background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                            }}
                          >
                            {s.category.toUpperCase()}
                          </span>
                          <span className="text-xs text-faint">
                            {new Date(s.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="mb-1 font-display text-xl font-bold text-fg">
                          {s.title}
                        </h3>
                        <div className="mb-4 space-y-1 text-xs text-muted">
                          <p>
                            <strong>Date:</strong> {formatDateLabel(s.date)}
                          </p>
                          <p>
                            <strong>Location:</strong> {s.venue}, {s.city}
                          </p>
                          <p>
                            <strong>Email:</strong>{" "}
                            <a
                              href={`mailto:${s.organizer_email}`}
                              className="text-brand-soft underline hover:text-brand"
                            >
                              {s.organizer_email}
                            </a>
                          </p>
                        </div>
                        <p className="mb-4 line-clamp-4 rounded-xl bg-ink-2 p-3.5 text-sm text-muted">
                          {s.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        {s.status === "pending" ? (
                          <>
                            <button
                              onClick={() => approve(s)}
                              disabled={busyId === s.id}
                              className="flex-1 rounded-full bg-host py-2 text-xs font-medium text-white transition-colors hover:bg-host-soft disabled:opacity-60"
                            >
                              {busyId === s.id ? "Working…" : "Approve & Publish"}
                            </button>
                            <button
                              onClick={() => decline(s.id)}
                              disabled={busyId === s.id}
                              className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium text-muted hover:border-fg hover:text-fg disabled:opacity-60"
                            >
                              Decline
                            </button>
                          </>
                        ) : (
                          <div className="w-full py-2 text-center">
                            <span
                              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                                s.status === "approved"
                                  ? "bg-host/15 text-host-soft"
                                  : "bg-red-500/10 text-red-600"
                              }`}
                            >
                              {s.status.toUpperCase()}
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

        {/* Create */}
        {!loading && activeTab === "create" && (
          <div className="max-w-3xl">
            <h2 className="mb-6 font-display text-2xl font-bold text-fg">
              Publish New Event
            </h2>
            <form
              onSubmit={createEvent}
              className="space-y-6 rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Event Title" required>
                  <input
                    type="text"
                    required
                    value={eventForm.title}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, title: e.target.value })
                    }
                    className={inputCls}
                    placeholder="AI Meetup Chennai"
                  />
                </Field>
                <Field label="Category">
                  <select
                    value={eventForm.category}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        category: e.target.value as EventCategory,
                      })
                    }
                    className={inputCls}
                  >
                    {eventCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date" required>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, date: e.target.value })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Time (Label)" required>
                  <input
                    type="text"
                    required
                    value={eventForm.time}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, time: e.target.value })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="City" required>
                  <input
                    type="text"
                    required
                    value={eventForm.city}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, city: e.target.value })
                    }
                    className={inputCls}
                    placeholder="Chennai"
                  />
                </Field>
                <Field label="Venue Name" required>
                  <input
                    type="text"
                    required
                    value={eventForm.venue}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, venue: e.target.value })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Address">
                <input
                  type="text"
                  value={eventForm.address}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, address: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Price Type">
                  <select
                    value={eventForm.price}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        price: e.target.value as "Free" | "Paid",
                      })
                    }
                    className={inputCls}
                  >
                    <option value="Free">Free</option>
                    <option value="Paid">Paid</option>
                  </select>
                </Field>
                <Field label="Price Label">
                  <input
                    type="text"
                    required
                    disabled={eventForm.price === "Free"}
                    value={eventForm.price === "Free" ? "Free" : eventForm.priceLabel}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, priceLabel: e.target.value })
                    }
                    className={`${inputCls} disabled:opacity-50`}
                    placeholder="₹299"
                  />
                </Field>
                <Field label="Capacity">
                  <input
                    type="number"
                    required
                    min={1}
                    value={eventForm.capacity}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        capacity: Number(e.target.value),
                      })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Blurb (Short Summary)" required>
                <input
                  type="text"
                  required
                  value={eventForm.blurb}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, blurb: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>

              <Field label="About (Full Description)" required>
                <textarea
                  rows={4}
                  required
                  value={eventForm.about}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, about: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>

              <div className="border-t border-line pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-fg">Speakers</h3>
                  <button
                    type="button"
                    onClick={addSpeaker}
                    className="text-xs font-semibold text-brand-soft hover:text-brand"
                  >
                    + Add Speaker
                  </button>
                </div>
                <div className="space-y-4">
                  {speakers.map((sp, i) => (
                    <div key={i} className="flex items-end gap-4">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Speaker Name
                        </label>
                        <input
                          type="text"
                          value={sp.name}
                          onChange={(e) => changeSpeaker(i, "name", e.target.value)}
                          className={`${inputCls} py-2.5 text-xs`}
                          placeholder="Nikhil Varma"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Role / Bio
                        </label>
                        <input
                          type="text"
                          value={sp.role}
                          onChange={(e) => changeSpeaker(i, "role", e.target.value)}
                          className={`${inputCls} py-2.5 text-xs`}
                          placeholder="ML Engineer, Freshworks"
                        />
                      </div>
                      {speakers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSpeaker(i)}
                          className="pb-3 text-xs text-red-500 hover:text-red-700"
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
                disabled={busyId === "create"}
                className="w-full rounded-full bg-brand px-7 py-3.5 text-base font-medium text-white transition-all hover:bg-brand-soft hover:-translate-y-0.5 disabled:opacity-60"
              >
                {busyId === "create" ? "Publishing…" : "Create & Publish Event"}
              </button>
            </form>
          </div>
        )}

        {/* Manage */}
        {!loading && activeTab === "manage" && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-fg">
              All Active Events
            </h2>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-ink-2 text-xs font-bold uppercase text-muted">
                    <th className="p-4">Event Details</th>
                    <th className="hidden p-4 sm:table-cell">Category</th>
                    <th className="hidden p-4 sm:table-cell">City</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Source</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {events.map((ev) => (
                    <tr key={ev.id} className="transition-colors hover:bg-ink/30">
                      <td className="p-4">
                        <p className="font-semibold text-fg">{ev.title}</p>
                        <p className="mt-0.5 text-xs text-faint">
                          {ev.date_label || formatDateLabel(ev.date)} · {ev.time}
                        </p>
                      </td>
                      <td className="hidden p-4 sm:table-cell">
                        <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-muted">
                          {ev.category}
                        </span>
                      </td>
                      <td className="hidden p-4 text-muted sm:table-cell">
                        {ev.city}
                      </td>
                      <td className="p-4 font-medium text-muted">
                        {ev.price_label}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            ev.source === "system"
                              ? "bg-ink-2 text-faint"
                              : "bg-brand/10 text-brand-soft"
                          }`}
                        >
                          {ev.source === "system" ? "System" : "Custom"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {ev.source === "system" ? (
                          <span className="text-xs italic text-faint">
                            Read Only
                          </span>
                        ) : (
                          <button
                            onClick={() => deleteEvent(ev.id)}
                            disabled={busyId === ev.id}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-60"
                          >
                            {busyId === ev.id ? "…" : "Delete"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users */}
        {!loading && activeTab === "users" && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-fg">
              Community Members
            </h2>
            {users.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
                <p className="text-sm text-muted">No users yet.</p>
                <p className="mt-1 text-xs text-faint">
                  Sign-ups appear here automatically once the profile trigger runs.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-ink-2 text-xs font-bold uppercase text-muted">
                      <th className="p-4">User</th>
                      <th className="hidden p-4 lg:table-cell">Joined</th>
                      <th className="p-4">Primary role</th>
                      <th className="p-4">Roles (click to toggle)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-sm">
                    {users.map((u) => {
                      const userRoles = rolesByUser[u.id] ?? [];
                      return (
                        <tr key={u.id} className="align-top hover:bg-ink/30">
                          <td className="p-4">
                            <p className="font-semibold text-fg">
                              {u.full_name || "—"}
                              {u.id === adminId && (
                                <span className="ml-2 text-xs font-normal text-faint">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-faint">{u.email}</p>
                            {u.city && (
                              <p className="text-xs text-faint">{u.city}</p>
                            )}
                          </td>
                          <td className="hidden p-4 text-xs text-muted lg:table-cell">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <select
                              value={u.primary_role}
                              disabled={busyId === u.id + "primary"}
                              onChange={(e) =>
                                changePrimaryRole(u.id, e.target.value as AppRole)
                              }
                              className="rounded-lg border border-line bg-ink px-2 py-1.5 text-xs text-fg focus:border-brand focus:outline-none"
                            >
                              {ALL_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {roleLabel(r)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_ROLES.map((r) => {
                                const has = userRoles.includes(r);
                                const busy = busyId === u.id + r;
                                return (
                                  <button
                                    key={r}
                                    onClick={() => toggleRole(u.id, r, has)}
                                    disabled={busy}
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                      has
                                        ? r === "admin"
                                          ? "bg-brand text-white"
                                          : "bg-host/20 text-host-soft"
                                        : "border border-line text-faint hover:text-fg"
                                    }`}
                                  >
                                    {has ? "✓ " : "+ "}
                                    {roleLabel(r)}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

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
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fg">
        {label}
        {required && <span className="text-brand-soft"> *</span>}
      </label>
      {children}
    </div>
  );
}
