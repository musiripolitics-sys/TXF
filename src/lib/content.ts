import "server-only";
import { createClient } from "@/lib/supabase/server";
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
export async function getLeaders(): Promise<Leader[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
}

/** Partner names for the marquee — from `partners`, falls back to static data. */
export async function getPartners(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("partners")
      .select("name,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) return staticPartners;
    return data.map((p) => p.name);
  } catch {
    return staticPartners;
  }
}

/** "What we do" activities — from `activities`, falls back to static data. */
export async function getActivities(): Promise<Activity[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
}

/** Member benefits grid — from `benefits`, falls back to static data. */
export async function getMemberBenefits(): Promise<MemberBenefit[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
}

/** Membership tiers with perks — from `membership_plans` + `plan_benefits`. */
export async function getTiers(): Promise<Tier[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
}
