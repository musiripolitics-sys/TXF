import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  events as staticEvents,
  getEvent as getStaticEvent,
  type TXFEvent,
} from "@/lib/data";
import { dbEventToTXF, type DBEvent } from "./events-map";

const COLS =
  "id,slug,title,category,date,date_label,time,city,venue,address,price_type,price_label,blurb,about,spots_left,capacity,image_url,starts_at,ends_at";

/**
 * Published events from Supabase, newest date first.
 * Falls back to the static seed data if the table is empty or unreachable,
 * so the page always renders.
 */
export async function getEvents(): Promise<TXFEvent[]> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("events")
      .select(COLS)
      .eq("status", "published")
      .gte("date", today) // past events drop off the listing
      .order("date", { ascending: true });

    if (error || !data || data.length === 0) return staticEvents;
    return (data as DBEvent[]).map(dbEventToTXF);
  } catch {
    return staticEvents;
  }
}

/** A single published event by slug, with speakers. Falls back to static data. */
export async function getEventBySlug(slug: string): Promise<TXFEvent | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select(`${COLS}, event_speakers(sort_order, speakers(name, role, initials)), event_agenda(sort_order, when_label, what)`)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error || !data) return getStaticEvent(slug) ?? null;
    const txf = dbEventToTXF(data as unknown as DBEvent);

    // Host name is fetched separately and tolerantly so a DB that hasn't run
    // the host_name migration yet still renders the event normally.
    try {
      const { data: h } = await supabase
        .from("events")
        .select("host_name,host_id")
        .eq("slug", slug)
        .maybeSingle();
      if (h?.host_name) txf.hostName = h.host_name;
      if (h?.host_id) txf.hostId = h.host_id;
    } catch {
      /* column not present yet — ignore */
    }

    // Ticket tiers, fetched tolerantly so a DB without the Phase 1 migration
    // still renders the event (it just falls back to the single event price).
    try {
      const { data: tiers } = await supabase
        .from("ticket_types")
        .select(
          "id,name,description,price_amount,capacity,sold,sales_start,sales_end,max_per_order,sort_order",
        )
        .eq("event_id", txf.id ?? "")
        .order("sort_order", { ascending: true });

      if (tiers && tiers.length > 0) {
        const now = Date.now();
        txf.ticketTypes = tiers.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description ?? undefined,
          priceAmount: t.price_amount ?? 0,
          priceLabel:
            (t.price_amount ?? 0) === 0
              ? "Free"
              : `₹${((t.price_amount ?? 0) / 100).toLocaleString("en-IN")}`,
          available: Math.max((t.capacity ?? 0) - (t.sold ?? 0), 0),
          maxPerOrder: t.max_per_order ?? 10,
          salesNotStarted: !!t.sales_start && new Date(t.sales_start).getTime() > now,
          salesEnded: !!t.sales_end && new Date(t.sales_end).getTime() < now,
        }));
      }
    } catch {
      /* ticket_types not present yet — ignore */
    }

    // Custom registration questions (tolerant — table may not exist yet).
    try {
      const { data: qs } = await supabase
        .from("event_questions")
        .select("id,label,type,options,required,sort_order")
        .eq("event_id", txf.id ?? "")
        .order("sort_order", { ascending: true });
      if (qs && qs.length > 0) {
        txf.questions = qs.map((q) => ({
          id: q.id,
          label: q.label,
          type: (q.type ?? "text") as "text" | "textarea" | "select",
          options: q.options ?? undefined,
          required: !!q.required,
        }));
      }
    } catch {
      /* event_questions not present yet — ignore */
    }

    return txf;
  } catch {
    return getStaticEvent(slug) ?? null;
  }
}
