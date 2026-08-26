"use client";

import { useState, useEffect, useCallback } from "react";
import { eventCategories, categoryTheme, type EventCategory } from "@/lib/data";
import { decideHostRequest } from "@/app/admin/actions";
import { toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";

const SUBMISSION_BASE =
  "id,title,category,date,city,venue,organizer_email,organizer_id,description,status,submitted_at,price_type,price_amount,capacity";
// Added by the event-discovery section of schema.sql.
const SUBMISSION_COLS = `${SUBMISSION_BASE},tags,time`;

type Submission = {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  city: string;
  venue: string;
  organizer_email: string;
  organizer_id: string | null;
  description: string;
  status: "pending" | "approved" | "declined";
  submitted_at: string;
  price_type: "Free" | "Paid";
  price_amount: number;
  capacity: number;
  tags?: string[] | null;
  time?: string | null;
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
  host_status: "none" | "pending" | "approved" | "rejected";
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
  const supabase = createClient();

  type Report = {
    id: string;
    post_id: string | null;
    comment_id: string | null;
    reason: string | null;
    created_at: string;
    body: string | null;
    author_name: string | null;
  };
  const [reports, setReports] = useState<Report[]>([]);

  const [activeTab, setActiveTab] = useState<
    "overview" | "submissions" | "create" | "manage" | "users" | "payouts" | "reports"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [regCount, setRegCount] = useState(0);
  const [payments, setPayments] = useState<
    { amount: number; stream: string; status: string }[]
  >([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Event queued for deletion; when set, the confirmation dialog is shown.
  const [eventToDelete, setEventToDelete] = useState<EventRow | null>(null);

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
    tags: "",
    highlights: "",
    refundPolicy: "",
    latitude: "",
    longitude: "",
  });
  const [speakers, setSpeakers] = useState<{ name: string; role: string }[]>([
    { name: "", role: "" },
  ]);
  const [agenda, setAgenda] = useState<{ when: string; what: string }[]>([
    { when: "Doors open", what: "Registration & check-in" },
    { when: "Kickoff", what: "Welcome & intro" },
    { when: "Main session", what: "Talks & deep-dive sessions" },
    { when: "Break", what: "Networking & refreshments" },
    { when: "Wrap-up", what: "Panel, Q&A and closing" },
  ]);

  // Ticket tiers. Price is entered in rupees and stored in paise.
  type TierRow = {
    name: string;
    price: number;
    capacity: number;
    salesEnd: string;
    maxPerOrder: number;
  };
  const blankTier: TierRow = {
    name: "General Admission",
    price: 0,
    capacity: 100,
    salesEnd: "",
    maxPerOrder: 10,
  };
  const [tiers, setTiers] = useState<TierRow[]>([blankTier]);

  type HostEarning = {
    host_id: string;
    host_name: string | null;
    host_email: string | null;
    gross: number;
    platform_fee: number;
    net: number;
    paid_out: number;
    balance: number;
  };
  const [hostEarnings, setHostEarnings] = useState<HostEarning[]>([]);

  const payHost = async (h: HostEarning) => {
    if (h.balance <= 0) return;
    setBusyId(h.host_id + "payout");
    const { error } = await supabase.rpc("record_payout", {
      p_host_id: h.host_id,
      p_amount: h.balance,
      p_note: "Settled from admin console",
    });
    setBusyId(null);
    if (error) return toast(error.message, "error");
    toast(`Payout of ₹${(h.balance / 100).toLocaleString("en-IN")} recorded.`, "success");
    await refresh();
  };

  const updateTier = (i: number, patch: Partial<TierRow>) =>
    setTiers((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addTier = () =>
    setTiers((rows) => [
      ...rows,
      { ...blankTier, name: "", capacity: 50 },
    ]);
  const removeTier = (i: number) =>
    setTiers((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  /** Writes ticket tiers for a freshly created event. */
  const saveTiers = async (eventId: string, rows: TierRow[]) => {
    const valid = rows.filter((r) => r.name.trim() && r.capacity > 0);
    const list = valid.length > 0 ? valid : [blankTier];
    await supabase.from("ticket_types").insert(
      list.map((r, idx) => ({
        event_id: eventId,
        name: r.name.trim() || "General Admission",
        price_amount: Math.round((r.price || 0) * 100),
        capacity: Number(r.capacity),
        max_per_order: Number(r.maxPerOrder) || 10,
        sales_end: r.salesEnd ? new Date(r.salesEnd).toISOString() : null,
        sort_order: idx,
      })),
    );
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    const [
      { data: subs },
      { data: evs },
      { data: usrs },
      { data: roleRows },
      { count: regs },
      { data: pays },
    ] = await Promise.all([
      supabase
        .from("host_submissions")
        .select(SUBMISSION_COLS)
        .order("submitted_at", { ascending: false })
        .then(async (r) =>
          // Pending migration: fall back to the columns that definitely exist.
          r.error
            ? await supabase
                .from("host_submissions")
                .select(SUBMISSION_BASE)
                .order("submitted_at", { ascending: false })
            : r,
        ),
      supabase
        .from("events")
        .select("id,slug,title,category,date,date_label,time,city,price_label,source")
        .order("date", { ascending: true }),
      supabase
        .from("users")
        .select("id,email,full_name,city,primary_role,host_status,points,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase
        .from("registrations")
        .select("id", { count: "exact", head: true }),
      supabase.from("payments").select("amount,stream,status"),
    ]);

    setSubmissions((subs as Submission[]) ?? []);
    setEvents((evs as EventRow[]) ?? []);
    setUsers((usrs as AppUser[]) ?? []);
    setRegCount(regs ?? 0);

    // Open moderation reports — tolerant so a DB without the reports migration
    // simply shows an empty tab.
    try {
      const { data: reps } = await supabase
        .from("post_reports")
        .select("id, post_id, comment_id, reason, created_at")
        .eq("resolved", false)
        .order("created_at", { ascending: false });

      if (reps && reps.length > 0) {
        const postIds = reps.map((r) => r.post_id).filter(Boolean) as string[];
        const commentIds = reps.map((r) => r.comment_id).filter(Boolean) as string[];
        const [{ data: ps }, { data: cs }] = await Promise.all([
          postIds.length
            ? supabase.from("posts").select("id, body, author_name").in("id", postIds)
            : Promise.resolve({ data: [] }),
          commentIds.length
            ? supabase.from("post_comments").select("id, body, author_name").in("id", commentIds)
            : Promise.resolve({ data: [] }),
        ]);
        const byId = new Map<string, { body: string; author_name: string }>();
        for (const x of [...(ps ?? []), ...(cs ?? [])]) byId.set(x.id, x);
        setReports(
          reps.map((r) => {
            const t = byId.get((r.post_id ?? r.comment_id) as string);
            return { ...r, body: t?.body ?? null, author_name: t?.author_name ?? null };
          }),
        );
      } else {
        setReports([]);
      }
    } catch {
      setReports([]);
    }

    // Host payout ledger — tolerant so a DB without the payouts migration
    // simply shows an empty tab instead of erroring.
    try {
      const { data: he } = await supabase.rpc("get_all_host_earnings");
      if (he) setHostEarnings(he as HostEarning[]);
    } catch {
      /* not available yet */
    }
    setPayments(
      (pays as { amount: number; stream: string; status: string }[]) ?? [],
    );

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
        time: s.time || "10:00 AM – 1:00 PM IST",
        city: s.city,
        venue: s.venue,
        address: `${s.venue}, ${s.city}`,
        tags: s.tags ?? [],
        price_type: s.price_type ?? "Free",
        price_label:
          s.price_type === "Paid" && s.price_amount > 0
            ? `₹${(s.price_amount / 100).toLocaleString("en-IN")}`
            : "Free",
        price_amount: s.price_amount ?? 0,
        blurb: s.description.slice(0, 100) + (s.description.length > 100 ? "…" : ""),
        about: s.description,
        capacity: s.capacity ?? 100,
        spots_left: s.capacity ?? 100,
        status: "published",
        source: "host_submission",
        submission_id: s.id,
        host_id: s.organizer_id,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!error && inserted) {
      // Every event needs at least one tier or it can't be registered for.
      await saveTiers(inserted.id, [
        {
          name: "General Admission",
          price: (s.price_amount ?? 0) / 100,
          capacity: s.capacity ?? 100,
          salesEnd: "",
          maxPerOrder: 10,
        },
      ]);

      // Denormalise the host's name onto the event (tolerant: silently no-ops
      // if the host_name column migration hasn't been run yet).
      const hostName = users.find((u) => u.id === s.organizer_id)?.full_name;
      if (hostName) {
        await supabase
          .from("events")
          .update({ host_name: hostName })
          .eq("id", inserted.id);
      }

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
    setEventToDelete(null);
    await refresh();
  };

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    // Prevent an admin from removing their own admin role (avoids lockout).
    if (role === "admin" && userId === adminId && has) {
      toast("You can't remove your own admin role.", "error");
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

  const approveHost = async (userId: string) => {
    setBusyId(userId + "host");
    await decideHostRequest(userId, true);
    setBusyId(null);
    await refresh();
  };

  const rejectHost = async (userId: string) => {
    setBusyId(userId + "host");
    await decideHostRequest(userId, false);
    setBusyId(null);
    await refresh();
  };

  const pendingHostCount = users.filter((u) => u.host_status === "pending").length;

  const addSpeaker = () => setSpeakers([...speakers, { name: "", role: "" }]);
  const removeSpeaker = (i: number) =>
    setSpeakers(speakers.filter((_, idx) => idx !== i));
  const changeSpeaker = (i: number, field: "name" | "role", value: string) => {
    const next = [...speakers];
    next[i][field] = value;
    setSpeakers(next);
  };

  const addAgendaItem = () => setAgenda([...agenda, { when: "", what: "" }]);
  const removeAgendaItem = (i: number) =>
    setAgenda(agenda.filter((_, idx) => idx !== i));
  const changeAgendaItem = (i: number, field: "when" | "what", value: string) => {
    const next = [...agenda];
    next[i][field] = value;
    setAgenda(next);
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId("create");

    // The event's headline price and capacity are derived from its tiers, so
    // the listing, the detail page and the tiers can never disagree.
    const validTiers = tiers.filter((t) => t.name.trim() && t.capacity > 0);
    const tierList = validTiers.length > 0 ? validTiers : [blankTier];
    const totalCapacity = tierList.reduce((sum, t) => sum + Number(t.capacity), 0);
    const cheapest = Math.min(...tierList.map((t) => Math.round((t.price || 0) * 100)));
    const isFree = cheapest === 0;

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
        price_type: isFree ? "Free" : "Paid",
        price_label: isFree ? "Free" : `₹${(cheapest / 100).toLocaleString("en-IN")}`,
        price_amount: cheapest,
        blurb: eventForm.blurb,
        about: eventForm.about,
        tags: Array.from(
          new Set(
            eventForm.tags
              .split(",")
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean),
          ),
        ),
        highlights: eventForm.highlights
          .split("\n")
          .map((h) => h.trim())
          .filter(Boolean),
        refund_policy: eventForm.refundPolicy.trim() || null,
        latitude: eventForm.latitude.trim() ? Number(eventForm.latitude) : null,
        longitude: eventForm.longitude.trim() ? Number(eventForm.longitude) : null,
        capacity: totalCapacity,
        spots_left: totalCapacity,
        status: "published",
        source: "custom",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!error && inserted) {
      // Without tiers the event can't be registered for at all.
      await saveTiers(inserted.id, tierList);

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

      const validAgenda = agenda.filter((a) => a.when.trim() && a.what.trim());
      if (validAgenda.length) {
        await supabase.from("event_agenda").insert(
          validAgenda.map((row, idx) => ({
            event_id: inserted.id,
            when_label: row.when,
            what: row.what,
            sort_order: idx,
          })),
        );
      }
    }

    setBusyId(null);
    setEventForm({
      title: "",
      category: "Meetup",
      tags: "",
      highlights: "",
      refundPolicy: "",
      latitude: "",
      longitude: "",
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
    setTiers([blankTier]);
    setAgenda([
      { when: "Doors open", what: "Registration & check-in" },
      { when: "Kickoff", what: "Welcome & intro" },
      { when: "Main session", what: "Talks & deep-dive sessions" },
      { when: "Break", what: "Networking & refreshments" },
      { when: "Wrap-up", what: "Panel, Q&A and closing" },
    ]);
    await refresh();
    setActiveTab("manage");
  };

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <>
      <header className="border-b border-line bg-ink-2">
        <div className="mx-auto flex max-w-7xl items-baseline justify-between gap-4 px-5 py-8 sm:px-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-fg">
              Console
            </h1>
            <p className="mt-1 text-sm text-muted">
              Manage event requests, approve submissions, and publish events.
            </p>
          </div>
          <p className="hidden text-xs text-faint sm:block">{adminEmail}</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex gap-8 overflow-x-auto border-b border-line">
          {(["overview", "submissions", "create", "manage", "users", "payouts", "reports"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 pb-4 text-sm font-semibold tracking-wide transition-all ${
                activeTab === tab
                  ? "border-brand text-brand-soft"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {tab === "overview" && "Overview"}
              {tab === "submissions" && `Host Submissions (${pendingCount})`}
              {tab === "create" && "Create Event"}
              {tab === "manage" && `Manage Events (${events.length})`}
              {tab === "users" && `Users (${users.length})`}
              {tab === "payouts" && "Payouts"}
              {tab === "reports" && (reports.length > 0 ? `Reports (${reports.length})` : "Reports")}
            </button>
          ))}
        </div>

        {loading && (
          <p className="py-12 text-center text-sm text-muted">Loading…</p>
        )}

        {/* Overview */}
        {!loading &&
          activeTab === "overview" &&
          (() => {
            const paid = payments.filter((p) => p.status === "paid");
            const sum = (stream?: string) =>
              paid
                .filter((p) => !stream || p.stream === stream)
                .reduce((a, p) => a + (p.amount || 0), 0);
            const inr = (paise: number) =>
              `₹${(paise / 100).toLocaleString("en-IN")}`;
            const byRole = (r: AppRole) =>
              users.filter((u) => u.primary_role === r).length;

            const cards = [
              {
                label: "Community Members",
                value: String(users.length),
                sub: `${byRole("event_host")} hosts · ${byRole("admin")} admins`,
              },
              {
                label: "Published Events",
                value: String(events.length),
                sub: "live on the site",
              },
              {
                label: "Registrations",
                value: regCount.toLocaleString("en-IN"),
                sub: "tickets issued",
              },
              {
                label: "Total Revenue",
                value: inr(sum()),
                sub: `${inr(sum("ticket_sales"))} tickets · ${inr(sum("membership"))} memberships`,
              },
            ];

            return (
              <div className="space-y-8">
                <h2 className="font-display text-2xl font-bold text-fg">
                  Overview
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {cards.map((c) => (
                    <div
                      key={c.label}
                      className="rounded-2xl border border-line bg-surface p-5 shadow-soft"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider text-faint">
                        {c.label}
                      </p>
                      <p className="mt-3 font-display text-3xl font-bold text-fg">
                        {c.value}
                      </p>
                      <p className="mt-1 text-xs text-muted">{c.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Action items */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    onClick={() => setActiveTab("submissions")}
                    className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5 text-left shadow-soft transition-colors hover:border-brand/40"
                  >
                    <span className="text-sm font-medium text-fg">
                      Pending event submissions
                    </span>
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-bold text-brand-soft">
                      {pendingCount}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("users")}
                    className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5 text-left shadow-soft transition-colors hover:border-brand/40"
                  >
                    <span className="text-sm font-medium text-fg">
                      Pending host requests
                    </span>
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-600">
                      {pendingHostCount}
                    </span>
                  </button>
                </div>
              </div>
            );
          })()}

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

              {/* Ticket tiers — price and capacity come from these rows. */}
              <div className="rounded-2xl border border-line bg-ink-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-fg">Ticket types</h3>
                    <p className="mt-0.5 text-xs text-muted">
                      Add tiers like Early Bird or VIP. Price in ₹ (0 = free).
                      Event capacity is the total across tiers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addTier}
                    className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:border-brand hover:text-brand"
                  >
                    + Add tier
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {tiers.map((t, i) => (
                    <div
                      key={i}
                      className="grid gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[2fr_1fr_1fr_1.4fr_auto]"
                    >
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-muted">Name</span>
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => updateTier(i, { name: e.target.value })}
                          placeholder="Early Bird"
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-muted">Price ₹</span>
                        <input
                          type="number"
                          min={0}
                          value={t.price}
                          onChange={(e) => updateTier(i, { price: Number(e.target.value) })}
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-muted">Capacity</span>
                        <input
                          type="number"
                          min={1}
                          value={t.capacity}
                          onChange={(e) => updateTier(i, { capacity: Number(e.target.value) })}
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-muted">
                          Sales end (optional)
                        </span>
                        <input
                          type="date"
                          value={t.salesEnd}
                          onChange={(e) => updateTier(i, { salesEnd: e.target.value })}
                          className={inputCls}
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeTier(i)}
                          disabled={tiers.length === 1}
                          aria-label="Remove ticket type"
                          className="rounded-full border border-line px-3 py-2 text-xs text-muted hover:border-red-500/40 hover:text-red-500 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-xs text-faint">
                  Total capacity:{" "}
                  <strong className="text-fg">
                    {tiers.reduce((s, t) => s + (Number(t.capacity) || 0), 0)}
                  </strong>
                </p>
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

              <Field label="Tags">
                <input
                  value={eventForm.tags}
                  onChange={(e) => setEventForm({ ...eventForm, tags: e.target.value })}
                  placeholder="react, beginner, students welcome"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-faint">
                  Comma separated. Lowercased on save, so &ldquo;React&rdquo; and
                  &ldquo;react&rdquo; stay one tag. These become filters on the events page.
                </p>
              </Field>

              <Field label="Good to know">
                <textarea
                  rows={3}
                  value={eventForm.highlights}
                  onChange={(e) => setEventForm({ ...eventForm, highlights: e.target.value })}
                  placeholder={"Laptop required\nBeginner friendly\nLunch included"}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-faint">
                  One per line. Shown as a checklist on the event page — this is what
                  stops people emailing to ask.
                </p>
              </Field>

              <Field label="Map coordinates">
                <div className="flex gap-2">
                  <input
                    value={eventForm.latitude}
                    onChange={(e) => setEventForm({ ...eventForm, latitude: e.target.value })}
                    placeholder="Latitude (13.0827)"
                    inputMode="decimal"
                    className={inputCls}
                  />
                  <input
                    value={eventForm.longitude}
                    onChange={(e) => setEventForm({ ...eventForm, longitude: e.target.value })}
                    placeholder="Longitude (80.2707)"
                    inputMode="decimal"
                    className={inputCls}
                  />
                </div>
                <p className="mt-1 text-xs text-faint">
                  Optional. With both, the event page draws a map; without them it
                  shows the address and map links instead.
                </p>
              </Field>

              <Field label="Refund & cancellation policy">
                <textarea
                  rows={3}
                  value={eventForm.refundPolicy}
                  onChange={(e) => setEventForm({ ...eventForm, refundPolicy: e.target.value })}
                  placeholder="Full refund up to 48 hours before the event. After that, tickets are transferable but not refundable."
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-faint">
                  Shown on paid events only. Leaving this blank is why refund questions
                  end up in your inbox.
                </p>
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

              <div className="border-t border-line pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-fg">Agenda</h3>
                  <button
                    type="button"
                    onClick={addAgendaItem}
                    className="text-xs font-semibold text-brand-soft hover:text-brand"
                  >
                    + Add Agenda Item
                  </button>
                </div>
                <div className="space-y-4">
                  {agenda.map((a, i) => (
                    <div key={i} className="flex items-end gap-4">
                      <div className="flex-[0.5]">
                        <label className="mb-1 block text-xs font-medium text-muted">
                          When
                        </label>
                        <input
                          type="text"
                          value={a.when}
                          onChange={(e) => changeAgendaItem(i, "when", e.target.value)}
                          className={`${inputCls} py-2.5 text-xs`}
                          placeholder="Doors open"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-muted">
                          What
                        </label>
                        <input
                          type="text"
                          value={a.what}
                          onChange={(e) => changeAgendaItem(i, "what", e.target.value)}
                          className={`${inputCls} py-2.5 text-xs`}
                          placeholder="Registration & check-in"
                        />
                      </div>
                      {agenda.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAgendaItem(i)}
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
                            onClick={() => setEventToDelete(ev)}
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

        {/* Reports */}
        {!loading && activeTab === "reports" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-fg">Reported content</h2>
              <p className="mt-1 text-sm text-muted">
                Posts and comments members have flagged. Resolving clears it from
                this queue — delete the content itself from the community feed.
              </p>
            </div>

            {reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
                <p className="text-sm font-medium text-fg">Nothing reported</p>
                <p className="mt-1 text-sm text-faint">
                  Members can report a post or comment from the community feed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-line bg-surface p-5 shadow-soft"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-soft">
                          {r.post_id ? "Post" : "Comment"}
                          {r.author_name ? ` by ${r.author_name}` : ""}
                        </p>
                        <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm text-fg">
                          {r.body ?? "(the content has already been deleted)"}
                        </p>
                        <p className="mt-2 text-sm text-muted">
                          <span className="font-medium text-fg">Reason:</span>{" "}
                          {r.reason ?? "No reason given."}
                        </p>
                        <p className="mt-1 text-xs text-faint">
                          {new Date(r.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <a
                          href="/community"
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:border-brand hover:text-brand"
                        >
                          Open feed
                        </a>
                        <button
                          onClick={async () => {
                            const { error } = await supabase.rpc("resolve_report", {
                              p_report_id: r.id,
                            });
                            if (error) return toast("Couldn't resolve that report.", "error");
                            setReports((list) => list.filter((x) => x.id !== r.id));
                            toast("Report resolved.", "success");
                          }}
                          className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {/* Payouts */}
        {!loading && activeTab === "payouts" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-fg">Host payouts</h2>
              <p className="mt-1 text-sm text-muted">
                Hosts keep 90% of ticket sales on their events. Record a payout
                once you&apos;ve actually transferred the money.
              </p>
            </div>

            {hostEarnings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
                <p className="font-display text-lg text-fg">No host earnings yet.</p>
                <p className="mt-1 text-sm text-muted">
                  Once a host sells tickets, their balance shows up here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-line shadow-soft">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-ink-2 text-xs uppercase tracking-wider text-faint">
                    <tr>
                      <th className="p-4">Host</th>
                      <th className="p-4 text-right">Gross</th>
                      <th className="p-4 text-right">Fee (10%)</th>
                      <th className="p-4 text-right">Paid out</th>
                      <th className="p-4 text-right">Balance</th>
                      <th className="p-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {hostEarnings.map((h) => (
                      <tr key={h.host_id}>
                        <td className="p-4">
                          <p className="font-medium text-fg">
                            {h.host_name || "Host"}
                          </p>
                          <p className="text-xs text-faint">{h.host_email}</p>
                        </td>
                        <td className="p-4 text-right text-muted">
                          ₹{(h.gross / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-right text-muted">
                          −₹{(h.platform_fee / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-right text-muted">
                          ₹{(h.paid_out / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-right font-semibold text-fg">
                          ₹{(h.balance / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => payHost(h)}
                            disabled={h.balance <= 0 || busyId === h.host_id + "payout"}
                            className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-soft disabled:opacity-40"
                          >
                            {busyId === h.host_id + "payout"
                              ? "Recording…"
                              : "Mark paid"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-fg">
                Community Members
              </h2>
              {pendingHostCount > 0 && (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600">
                  {pendingHostCount} host request{pendingHostCount > 1 ? "s" : ""} pending
                </span>
              )}
            </div>
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
                      <th className="p-4">Host request</th>
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
                            {u.host_status === "pending" ? (
                              <div className="flex flex-col gap-1.5">
                                <span className="w-fit rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                                  Pending
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => approveHost(u.id)}
                                    disabled={busyId === u.id + "host"}
                                    className="rounded-full bg-host px-3 py-1 text-xs font-medium text-white hover:bg-host-soft disabled:opacity-60"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => rejectHost(u.id)}
                                    disabled={busyId === u.id + "host"}
                                    className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:text-fg disabled:opacity-60"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ) : u.host_status === "approved" ? (
                              <span className="rounded-full bg-host/15 px-2.5 py-0.5 text-xs font-semibold text-host-soft">
                                Approved
                              </span>
                            ) : u.host_status === "rejected" ? (
                              <button
                                onClick={() => approveHost(u.id)}
                                disabled={busyId === u.id + "host"}
                                className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 hover:bg-host/15 hover:text-host-soft disabled:opacity-60"
                                title="Rejected — click to approve instead"
                              >
                                Rejected
                              </button>
                            ) : (
                              <span className="text-xs text-faint">—</span>
                            )}
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

      {eventToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            if (busyId !== eventToDelete.id) setEventToDelete(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-event-title"
              className="text-lg font-semibold text-fg"
            >
              Delete this event?
            </h3>
            <p className="mt-2 text-sm text-muted">
              You&rsquo;re about to permanently delete{" "}
              <span className="font-semibold text-fg">
                {eventToDelete.title}
              </span>
              . This action can&rsquo;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEventToDelete(null)}
                disabled={busyId === eventToDelete.id}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-ink/40 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteEvent(eventToDelete.id)}
                disabled={busyId === eventToDelete.id}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {busyId === eventToDelete.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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
