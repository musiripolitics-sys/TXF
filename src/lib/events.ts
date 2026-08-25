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

/** A single published event by slug, with speakers, tiers and questions. */
export async function getEventBySlug(slug: string): Promise<TXFEvent | null> {
  try {
    const supabase = await createClient();
    // One round trip. Embedding the related rows here instead of issuing a
    // query each saves ~400ms of latency on this page.
    const { data, error } = await supabase
      .from("events")
      .select(
        `${COLS}, host_name, host_id,
         event_speakers(sort_order, speakers(name, role, initials)),
         event_agenda(sort_order, when_label, what),
         ticket_types(id,name,description,price_amount,capacity,sold,sales_start,sales_end,max_per_order,sort_order),
         event_questions(id,label,type,options,required,sort_order)`,
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error || !data) return getStaticEvent(slug) ?? null;

    const row = data as unknown as DBEvent & {
      host_name?: string | null;
      host_id?: string | null;
      ticket_types?: {
        id: string; name: string; description: string | null;
        price_amount: number | null; capacity: number | null; sold: number | null;
        sales_start: string | null; sales_end: string | null;
        max_per_order: number | null; sort_order: number | null;
      }[];
      event_questions?: {
        id: string; label: string; type: string | null;
        options: string[] | null; required: boolean | null; sort_order: number | null;
      }[];
    };

    const txf = dbEventToTXF(row);
    if (row.host_name) txf.hostName = row.host_name;
    if (row.host_id) txf.hostId = row.host_id;

    const now = Date.now();
    const tiers = (row.ticket_types ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (tiers.length > 0) {
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

    const qs = (row.event_questions ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (qs.length > 0) {
      txf.questions = qs.map((q) => ({
        id: q.id,
        label: q.label,
        type: (q.type ?? "text") as "text" | "textarea" | "select",
        options: q.options ?? undefined,
        required: !!q.required,
      }));
    }

    return txf;
  } catch {
    return getStaticEvent(slug) ?? null;
  }
}
