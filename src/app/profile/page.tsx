import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TicketRow } from "@/components/TicketRow";
import { dbEventToTXF, type DBEvent } from "@/lib/events-map";
import { Icon } from "@/components/Icon";
import { getCreditHistory } from "@/lib/community";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const supabase = await createClient();

  // Fetch Profile details
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, city, bio, points, primary_role, host_status")
    .eq("id", user.id)
    .single();

  // Credit ledger — tolerant, so a database without the community section of
  // schema.sql simply shows an empty history.
  const creditHistory = await getCreditHistory(supabase, user.id);

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    event_host: "Host",
    community_member: "Community Member",
  };
  const roleLabel = roleLabels[profile?.primary_role ?? "community_member"] ?? "Community Member";

  // Fetch Memberships & Plans
  const { data: membershipData } = await supabase
    .from("memberships")
    .select(`
      tier,
      status,
      membership_plans (
        name,
        tagline,
        plan_benefits (
          perk_text
        )
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch Registrations
  // Since we don't have a direct helper like `getEvents` for user specific, we'll query it here.
  // Saved / wishlisted events.
  let savedEvents: { slug: string; title: string; date_label: string | null; city: string }[] = [];
  try {
    const { data } = await supabase
      .from("saved_events")
      .select("events(slug,title,date_label,city)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    savedEvents = ((data ?? []) as unknown as { events: (typeof savedEvents)[number] | null }[])
      .map((r) => r.events)
      .filter((e): e is (typeof savedEvents)[number] => !!e);
  } catch {
    /* saved_events not present yet — hide the section */
  }

  // Order history — one row per purchase, with what was charged.
  let orders: {
    id: string;
    quantity: number;
    total: number;
    status: string;
    created_at: string;
    promo_code: string | null;
    events: { title: string; slug: string } | null;
    ticket_types: { name: string } | null;
  }[] = [];
  try {
    const { data } = await supabase
      .from("orders")
      .select(
        "id,quantity,total,status,created_at,promo_code, events(title,slug), ticket_types(name)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    // Supabase types embedded relations as arrays; they're single rows here.
    orders = (data as unknown as typeof orders) ?? [];
  } catch {
    /* orders table not present yet — hide the section */
  }

  const { data: registrationsData } = await supabase
    .from("registrations")
    .select(`
      status,
      ticket_code,
      attendee_name,
      events (
        id, slug, title, category, date, date_label, time, city, venue, address, price_type, price_label, blurb, about, spots_left, capacity, image_url
      )
    `)
    .eq("user_id", user.id);

  // Group events
  const registeredEvents = [];
  const attendedEvents = [];

  if (registrationsData) {
    for (const reg of registrationsData) {
      if (!reg.events) continue;
      const txfEvent = dbEventToTXF(reg.events as unknown as DBEvent);
      const rowData = { event: txfEvent, ticketCode: reg.ticket_code, attendeeName: reg.attendee_name, slug: txfEvent.slug + (reg.ticket_code || "") };
      if (reg.status === "registered") {
        registeredEvents.push(rowData);
      } else if (reg.status === "attended") {
        attendedEvents.push(rowData);
      }
    }
  }

  const membershipPlan = membershipData?.membership_plans as any;
  const perks = membershipPlan?.plan_benefits || [];

  // Directory eligibility: 100 points, or Elite (always).
  const points = profile?.points ?? 0;
  const isElite = membershipData?.tier === "Elite";
  const directoryEligible = isElite || points >= 100;
  const sessionsToGo = Math.max(0, Math.ceil((100 - points) / 10));

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-24">
      {/* Profile Header */}
      <section className="mb-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-surface border-2 border-brand/20 text-4xl font-display font-bold text-brand uppercase">
          {profile?.full_name ? profile.full_name[0] : user.email?.[0]}
        </div>
        <div className="flex flex-col">
          <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
            {profile?.full_name || "Community Member"}
          </h1>
          <p className="mt-1 text-lg text-muted">{profile?.email || user.email}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium text-fg">
            <span className="flex items-center gap-1.5 rounded-full bg-brand text-white px-3 py-1">
              {roleLabel}
            </span>
            {profile?.city && (
              <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 border border-line">
                <Icon name="map-pin" className="h-4 w-4 text-muted" /> {profile.city}
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-brand/10 text-brand-soft px-3 py-1 border border-brand/20">
              <Icon name="medal" className="h-4 w-4 text-brand-soft" /> {profile?.points || 0} Points
            </span>
          </div>
        </div>
        <a
          href="/profile/edit"
          className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium text-fg hover:border-brand/40 hover:text-brand-soft transition-colors sm:ml-auto"
        >
          Edit Profile
        </a>
      </section>

      {profile?.host_status === "pending" && (
        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="font-semibold text-amber-700">Host access pending</p>
          <p className="mt-1 text-sm text-amber-700/80">
            Your request to become a Host is awaiting admin approval. Until then
            you have Community Member access. We&apos;ll switch you over once
            it&apos;s approved.
          </p>
        </div>
      )}
      {profile?.host_status === "rejected" && (
        <div className="mb-8 rounded-2xl border border-line bg-surface p-5">
          <p className="font-semibold text-fg">Host request not approved</p>
          <p className="mt-1 text-sm text-muted">
            Your Host access request wasn&apos;t approved. Reach out via the{" "}
            <a href="/contact" className="text-brand-soft underline">
              contact page
            </a>{" "}
            if you think this was a mistake.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column (Events) */}
        <div className="space-y-8 lg:col-span-2">
          {/* Registered Events */}
          <section>
            <h2 className="mb-4 font-display text-xl font-bold text-fg">Upcoming Events</h2>
            {registeredEvents.length > 0 ? (
              <div className="flex flex-col gap-4">
                {registeredEvents.map((item) => (
                  <TicketRow key={item.slug} event={item.event} ticketCode={item.ticketCode} attendeeName={item.attendeeName} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-8 text-center">
                <Icon name="calendar" className="mx-auto mb-3 h-8 w-8 text-muted" />
                <p className="text-muted">You haven&apos;t registered for any upcoming events.</p>
              </div>
            )}
          </section>

          {/* Attended Events */}
          <section>
            <h2 className="mb-4 font-display text-xl font-bold text-fg">Past Attended Events</h2>
            {attendedEvents.length > 0 ? (
              <div className="flex flex-col gap-4">
                {attendedEvents.map((item) => (
                  <TicketRow key={item.slug} event={item.event} ticketCode={item.ticketCode} attendeeName={item.attendeeName} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-8 text-center">
                <Icon name="clock" className="mx-auto mb-3 h-8 w-8 text-muted" />
                <p className="text-muted">You haven&apos;t attended any events yet.</p>
              </div>
            )}
          </section>

          {/* Saved events */}
          {savedEvents.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-bold text-fg">
                Saved Events
              </h2>
              <div className="flex flex-col gap-3">
                {savedEvents.map((e) => (
                  <a
                    key={e.slug}
                    href={`/events/${e.slug}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{e.title}</p>
                      <p className="text-xs text-faint">
                        {e.date_label}
                        {e.city ? ` · ${e.city}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-brand-soft">
                      View →
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Order history */}
          <section>
            <h2 className="mb-4 font-display text-xl font-bold text-fg">
              Order History
            </h2>
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-8 text-center">
                <Icon name="ticket" className="mx-auto mb-3 h-8 w-8 text-muted" />
                <p className="text-muted">No orders yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                <table className="w-full border-collapse text-left text-sm">
                  <tbody className="divide-y divide-line">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="p-4">
                          <p className="font-medium text-fg">
                            {o.events?.title ?? "Event"}
                          </p>
                          <p className="text-xs text-faint">
                            {new Date(o.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                            {o.ticket_types?.name ? ` · ${o.ticket_types.name}` : ""}
                            {o.promo_code ? ` · code ${o.promo_code}` : ""}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-faint">
                            #{o.id.slice(0, 8).toUpperCase()}
                          </p>
                        </td>
                        <td className="p-4 text-center text-xs text-muted">
                          × {o.quantity}
                        </td>
                        <td className="p-4 text-right">
                          <p className="font-semibold text-fg">
                            {o.total > 0
                              ? `₹${(o.total / 100).toLocaleString("en-IN")}`
                              : "Free"}
                          </p>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide ${
                              o.status === "paid"
                                ? "text-host-soft"
                                : o.status === "refunded"
                                  ? "text-amber-600"
                                  : "text-faint"
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right Column (Membership details) */}
        <div className="lg:col-span-1">
          <section className="sticky top-24">
            <h2 className="mb-4 font-display text-xl font-bold text-fg">Membership & Benefits</h2>
            {membershipData ? (
              <div className="rounded-2xl border border-line bg-surface p-6 shadow-soft relative overflow-hidden group hover:border-brand/30 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Icon name="sparkle" className="w-24 h-24 text-brand" />
                </div>
                
                <h3 className="font-display text-2xl font-bold text-brand mb-1">
                  {membershipPlan?.name || membershipData.tier}
                </h3>
                <p className="text-sm text-muted mb-6">
                  {membershipPlan?.tagline || "Your active membership plan."}
                </p>

                <h4 className="font-semibold text-fg mb-4">Your Perks</h4>
                {perks.length > 0 ? (
                  <ul className="space-y-3">
                    {perks.map((p: any, i: number) => (
                      <li key={i} className="flex gap-3 text-sm text-fg">
                        <Icon name="check" className="h-5 w-5 shrink-0 text-brand" />
                        <span className="leading-snug">{p.perk_text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">No specific perks listed.</p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-6 text-center">
                <p className="text-muted mb-4">You do not have an active membership.</p>
                <a href="/membership" className="text-brand font-medium hover:underline">
                  View Plans
                </a>
              </div>
            )}

            {/* Credit history — why the balance is what it is */}
            <div id="credits" className="mt-6 scroll-mt-24 rounded-2xl border border-line bg-surface p-6 shadow-soft">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-fg">Credits</h3>
                <span className="font-display text-2xl font-bold tabular-nums text-fg">
                  {profile?.points ?? 0}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                You earn 10 credits each time you&apos;re checked in to a session.
                Credits unlock posting in the community and downloads in your
                session groups.
              </p>

              {creditHistory.length === 0 ? (
                <p className="mt-4 text-sm text-faint">
                  No movements yet — attend a session to earn your first 10.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2.5">
                  {creditHistory.map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-fg">
                          {e.reason ?? (e.delta > 0 ? "Credits earned" : "Credits spent")}
                        </p>
                        <p className="text-xs text-faint">
                          {new Date(e.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          e.delta > 0 ? "text-host-soft" : "text-muted"
                        }`}
                      >
                        {e.delta > 0 ? `+${e.delta}` : e.delta}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Directory progress */}
            <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-soft">
              <h3 className="font-display text-lg font-bold text-fg">
                Member directory
              </h3>
              {directoryEligible ? (
                <>
                  <p className="mt-1 text-sm font-medium text-host-soft">
                    ✓ You&apos;re eligible to be listed
                    {isElite ? " (Elite)" : ""}.
                  </p>
                  <a
                    href="/directory"
                    className="mt-4 inline-block text-sm font-medium text-brand-soft hover:underline"
                  >
                    Open the directory →
                  </a>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-muted">
                    Reach 100 points to unlock the networking directory.
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-faint">
                    <span>{points} / 100 points</span>
                    <span>
                      {sessionsToGo} more session{sessionsToGo === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-2">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.min(100, points)}%` }}
                    />
                  </div>
                  <a
                    href="/membership"
                    className="mt-4 inline-block text-xs font-medium text-brand-soft hover:underline"
                  >
                    Or go Elite to skip the wait →
                  </a>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
