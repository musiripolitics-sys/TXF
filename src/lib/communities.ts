import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Chapters — the persistent communities above per-event session groups.
 *
 * Tolerant like the rest of the community code: a database without the
 * communities section of schema.sql returns empty rather than throwing, so
 * the site keeps working while the migration is pending.
 */

export type CommunityKind = "city" | "topic";

export type Community = {
  id: string;
  slug: string;
  name: string;
  kind: CommunityKind;
  city: string | null;
  tagline: string | null;
  description: string | null;
  cover_image: string | null;
  topics: string[];
  member_count: number;
  join_policy: string;
  is_public: boolean;
  welcome_message: string | null;
};

export type CommunityMember = {
  user_id: string;
  role: string;
  full_name: string | null;
  city: string | null;
};

const COLS =
  "id,slug,name,kind,city,tagline,description,cover_image,topics,member_count,join_policy,is_public,welcome_message";

export async function getCommunities(
  supabase: SupabaseClient,
): Promise<Community[]> {
  try {
    const { data, error } = await supabase
      .from("communities")
      .select(COLS)
      .eq("status", "published")
      .order("member_count", { ascending: false });
    if (error || !data) return [];
    return data as Community[];
  } catch {
    return [];
  }
}

export async function getCommunityBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<Community | null> {
  try {
    const { data, error } = await supabase
      .from("communities")
      .select(COLS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;
    return data as Community;
  } catch {
    return null;
  }
}

/** Is this member in the chapter, and in what role? */
export async function getMembership(
  supabase: SupabaseClient,
  communityId: string,
  userId: string,
): Promise<{ role: string; state: string } | null> {
  try {
    const { data, error } = await supabase
      .from("community_members")
      .select("role, state")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data as { role: string; state: string };
  } catch {
    return null;
  }
}

/** Roster, organisers first — they're who a visitor wants to see. */
export async function getMembers(
  supabase: SupabaseClient,
  communityId: string,
  limit = 24,
): Promise<CommunityMember[]> {
  try {
    const { data, error } = await supabase
      .from("community_members")
      .select("user_id, role, users(full_name, city)")
      .eq("community_id", communityId)
      .eq("state", "active")
      .limit(limit);
    if (error || !data) return [];

    const order = ["organizer", "co_organizer", "host", "member"];
    return (data as unknown as {
      user_id: string;
      role: string;
      users: { full_name: string | null; city: string | null } | null;
    }[])
      .map((m) => ({
        user_id: m.user_id,
        role: m.role,
        full_name: m.users?.full_name ?? null,
        city: m.users?.city ?? null,
      }))
      .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  } catch {
    return [];
  }
}

/** A chapter's events, split into what's coming and what's already happened. */
export async function getCommunityEvents(
  supabase: SupabaseClient,
  communityId: string,
): Promise<{ upcoming: EventRow[]; past: EventRow[]; pastCount: number }> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: up }, { data: past, count }] = await Promise.all([
      supabase
        .from("events")
        .select("id,slug,title,date,date_label,city,venue,image_url,price_label")
        .eq("community_id", communityId)
        .eq("status", "published")
        .gte("date", today)
        .order("date", { ascending: true }),
      supabase
        .from("events")
        .select("id,slug,title,date,date_label,city,venue,image_url,price_label", {
          count: "exact",
        })
        .eq("community_id", communityId)
        .eq("status", "published")
        .lt("date", today)
        .order("date", { ascending: false })
        .limit(6),
    ]);
    return {
      upcoming: (up ?? []) as EventRow[],
      past: (past ?? []) as EventRow[],
      pastCount: count ?? 0,
    };
  } catch {
    return { upcoming: [], past: [], pastCount: 0 };
  }
}

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  date: string;
  date_label: string | null;
  city: string;
  venue: string;
  image_url: string | null;
  price_label: string | null;
};
