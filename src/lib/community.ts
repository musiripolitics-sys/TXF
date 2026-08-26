import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Community credits and session groups.
 *
 * Every read here is tolerant: a database that hasn't had the community
 * section of schema.sql applied yet returns defaults rather than throwing,
 * so the feed keeps working while the migration is pending.
 */

export type Gate = { minBalance: number; cost: number; label: string | null };
export type Gates = Record<string, Gate>;

export type CreditEntry = {
  id: string;
  delta: number;
  reason: string | null;
  created_at: string;
};

export type Group = { id: string; title: string; date: string | null };

export type CommunityFile = {
  id: string;
  title: string;
  description: string | null;
  size_bytes: number | null;
  credit_cost: number;
  unlocked: boolean;
};

/** Sensible gates for a database that predates community_gates. */
const FALLBACK_GATES: Gates = {
  comment: { minBalance: 0, cost: 0, label: "Comment on a post" },
  post_group: { minBalance: 0, cost: 0, label: "Post in a session group" },
  post_global: { minBalance: 0, cost: 0, label: "Post in a public channel" },
};

export async function getGates(supabase: SupabaseClient): Promise<Gates> {
  try {
    const { data, error } = await supabase
      .from("community_gates")
      .select("action, min_balance, cost, label");
    if (error || !data) return FALLBACK_GATES;

    const gates: Gates = {};
    for (const row of data) {
      gates[row.action] = {
        minBalance: row.min_balance ?? 0,
        cost: row.cost ?? 0,
        label: row.label ?? null,
      };
    }
    return Object.keys(gates).length > 0 ? gates : FALLBACK_GATES;
  } catch {
    return FALLBACK_GATES;
  }
}

/** Current balance. This is users.points — the ledger is the history behind it. */
export async function getBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    const { data } = await supabase
      .from("users")
      .select("points")
      .eq("id", userId)
      .maybeSingle();
    return data?.points ?? 0;
  } catch {
    return 0;
  }
}

/** Most recent credit movements, newest first. */
export async function getCreditHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<CreditEntry[]> {
  try {
    const { data, error } = await supabase
      .from("point_events")
      .select("id, delta, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as CreditEntry[];
  } catch {
    return [];
  }
}

/**
 * The session groups this member belongs to — one per event they attended.
 * Attendance is the membership; there is nothing to join.
 */
export async function getMyGroups(
  supabase: SupabaseClient,
  userId: string,
): Promise<Group[]> {
  try {
    const { data } = await supabase
      .from("registrations")
      .select("event_id, events(id, title, date)")
      .eq("user_id", userId)
      .eq("status", "attended");

    const seen = new Set<string>();
    const groups: Group[] = [];
    for (const r of data ?? []) {
      const ev = r.events as unknown as
        | { id: string; title: string; date: string | null }
        | null;
      if (ev && !seen.has(ev.id)) {
        seen.add(ev.id);
        groups.push({ id: ev.id, title: ev.title, date: ev.date });
      }
    }
    // Most recent event first — that's the group people actually want.
    groups.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return groups;
  } catch {
    return [];
  }
}

/** Files offered in a group, flagged with whether this member already has them. */
export async function getGroupFiles(
  supabase: SupabaseClient,
  eventId: string,
  userId: string,
): Promise<CommunityFile[]> {
  try {
    const [{ data: files, error }, { data: unlocks }] = await Promise.all([
      supabase
        .from("community_files")
        .select("id, title, description, size_bytes, credit_cost, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      supabase.from("file_unlocks").select("file_id").eq("user_id", userId),
    ]);
    if (error || !files) return [];

    const owned = new Set((unlocks ?? []).map((u) => u.file_id));
    return files.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      size_bytes: f.size_bytes,
      credit_cost: f.credit_cost ?? 0,
      unlocked: owned.has(f.id) || (f.credit_cost ?? 0) === 0,
    }));
  } catch {
    return [];
  }
}

/** Human-readable file size. */
export function formatBytes(n: number | null): string {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export type EarnedBadge = {
  slug: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  awarded_at: string;
};

/**
 * Badges this member has earned. Tolerant like everything else here: a
 * database without the trust-levels section just returns none.
 */
export async function getBadges(
  supabase: SupabaseClient,
  userId: string,
): Promise<EarnedBadge[]> {
  try {
    const { data, error } = await supabase
      .from("user_badges")
      .select("awarded_at, badges(slug, name, description, icon)")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false });
    if (error || !data) return [];

    return data
      .map((r) => {
        const b = r.badges as unknown as {
          slug: string | null;
          name: string;
          description: string | null;
          icon: string | null;
        } | null;
        return b ? { ...b, awarded_at: r.awarded_at as string } : null;
      })
      .filter((b): b is EarnedBadge => b !== null);
  } catch {
    return [];
  }
}
