import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  events as staticEvents,
  getEvent as getStaticEvent,
  type TXFEvent,
} from "@/lib/data";
import { dbEventToTXF, type DBEvent } from "./events-map";

const COLS =
  "id,slug,title,category,date,date_label,time,city,venue,address,price_type,price_label,blurb,about,spots_left,capacity,image_url";

/**
 * Published events from Supabase, newest date first.
 * Falls back to the static seed data if the table is empty or unreachable,
 * so the page always renders.
 */
export async function getEvents(): Promise<TXFEvent[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select(COLS)
      .eq("status", "published")
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
    return dbEventToTXF(data as unknown as DBEvent);
  } catch {
    return getStaticEvent(slug) ?? null;
  }
}
