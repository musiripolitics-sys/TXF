import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TicketRow } from "@/components/TicketRow";
import { dbEventToTXF, type DBEvent } from "@/lib/events-map";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const supabase = await createClient();

  // Fetch Profile details
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, city, bio, points")
    .eq("id", user.id)
    .single();

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
          <div className="mt-3 flex gap-3 text-sm font-medium text-fg">
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
      </section>

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
          </section>
        </div>
      </div>
    </main>
  );
}
