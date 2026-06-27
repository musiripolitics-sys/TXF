import "server-only";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  leaders as staticLeaders,
  partners as staticPartners,
  activities as staticActivities,
  tiers as staticTiers,
  memberBenefits as staticBenefits,
  type Leader,
  type LeaderRole,
  type Tier,
  type MemberBenefit,
} from "@/lib/data";

type Activity = { title: string; desc: string; accent: string };

// Cookie-less anon client. Public content has public-read RLS, so it doesn't
// need the user session — which is what lets these reads be cached across all
// requests/users via unstable_cache (the cookie-based server client can't be).
function publicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

// Revalidate window for marketing/content reads (1h). Admin edits can force a
// refresh via revalidateTag("txf-content").
const CACHE_OPTS = { revalidate: 3600, tags: ["txf-content"] };

function initialsFor(name: string, isHiring: boolean): string {
  if (isHiring) return "+";
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "TXF";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const staticActivitiesArr: Activity[] = staticActivities.map((a) => ({
  title: a.title,
  desc: a.desc,
  accent: a.accent,
}));

/** Leadership board / team — from `leader_profiles`, falls back to static data. */
export const getLeaders = unstable_cache(
  async (): Promise<Leader[]> => {
    try {
      const { data, error } = await publicClient()
        .from("leader_profiles")
        .select(
          "display_name,role,city,focus,bio,events_count,points,linkedin_url,is_hiring,image_url,sort_order",
        )
        .order("sort_order", { ascending: true });

      if (error || !data || data.length === 0) return staticLeaders;
      return data.map((r) => ({
        name: r.display_name,
        role: r.role as LeaderRole,
        initials: initialsFor(r.display_name, !!r.is_hiring),
        city: r.city ?? "",
        events: r.events_count ?? 0,
        points: r.points ?? 0,
        bio: r.bio ?? "",
        focus: r.focus ?? "",
        linkedin: r.linkedin_url ?? undefined,
        isHiring: r.is_hiring ?? undefined,
        image: r.image_url ?? undefined,
      }));
    } catch {
      return staticLeaders;
    }
  },
  ["content:leaders"],
  CACHE_OPTS,
);

/** Partner names for the marquee — from `partners`, falls back to static data. */
export const getPartners = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const { data, error } = await publicClient()
        .from("partners")
        .select("name,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error || !data || data.length === 0) return staticPartners;
      return data.map((p) => p.name);
    } catch {
      return staticPartners;
    }
  },
  ["content:partners"],
  CACHE_OPTS,
);

/** "What we do" activities — from `activities`, falls back to static data. */
export const getActivities = unstable_cache(
  async (): Promise<Activity[]> => {
    try {
      const { data, error } = await publicClient()
        .from("activities")
        .select("title,description,accent,sort_order")
        .order("sort_order", { ascending: true });

      if (error || !data || data.length === 0) return staticActivitiesArr;
      return data.map((a) => ({
        title: a.title,
        desc: a.description ?? "",
        accent: a.accent ?? "brand",
      }));
    } catch {
      return staticActivitiesArr;
    }
  },
  ["content:activities"],
  CACHE_OPTS,
);

/** Member benefits grid — from `benefits`, falls back to static data. */
export const getMemberBenefits = unstable_cache(
  async (): Promise<MemberBenefit[]> => {
    try {
      const { data, error } = await publicClient()
        .from("benefits")
        .select("title,description,icon,tag,sort_order")
        .order("sort_order", { ascending: true });

      if (error || !data || data.length === 0) return staticBenefits;
      return data.map((b) => ({
        title: b.title,
        desc: b.description ?? "",
        icon: b.icon ?? "sparkle",
        tag: b.tag ?? "",
      }));
    } catch {
      return staticBenefits;
    }
  },
  ["content:benefits"],
  CACHE_OPTS,
);

/** Membership tiers with perks — from `membership_plans` + `plan_benefits`. */
export const getTiers = unstable_cache(
  async (): Promise<Tier[]> => {
    try {
      const { data, error } = await publicClient()
        .from("membership_plans")
        .select(
          "name,price_amount,cadence,tagline,is_highlight,cta_label,sort_order, plan_benefits(perk_text,sort_order)",
        )
        .order("sort_order", { ascending: true });

      if (error || !data || data.length === 0) return staticTiers;
      return data.map((p) => ({
        name: p.name,
        price: `₹${((p.price_amount ?? 0) / 100).toLocaleString("en-IN")}`,
        cadence: p.cadence ?? "",
        tagline: p.tagline ?? "",
        highlight: p.is_highlight ?? undefined,
        cta: p.cta_label ?? "Join",
        perks: ((p.plan_benefits ?? []) as { perk_text: string | null; sort_order: number | null }[])
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((pb) => pb.perk_text)
          .filter((t): t is string => !!t),
      }));
    } catch {
      return staticTiers;
    }
  },
  ["content:tiers"],
  CACHE_OPTS,
);
