import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PaidTier = "Pro" | "Elite";

// Ticket discount per active membership tier.
export const MEMBER_DISCOUNTS: Record<PaidTier, number> = {
  Pro: 0.25, // 25% off
  Elite: 0.5, // 50% off
};

/** The user's active paid membership tier, or null. Server-side source of truth. */
export async function getActiveTier(
  supabase: SupabaseClient,
  userId: string,
): Promise<PaidTier | null> {
  const { data } = await supabase
    .from("memberships")
    .select("tier, status, renews_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;
  if (data.renews_at && new Date(data.renews_at) < new Date()) return null;
  if (data.tier === "Pro" || data.tier === "Elite") return data.tier;
  return null;
}

/** Apply the member discount to a paise amount (rounded to whole paise). */
export function applyMemberDiscount(
  amount: number,
  tier: PaidTier | null,
): number {
  if (!tier) return amount;
  return Math.round(amount * (1 - MEMBER_DISCOUNTS[tier]));
}

/** Discount percentage as an integer (e.g. 25), or 0 if none. */
export function discountPct(tier: PaidTier | null): number {
  return tier ? Math.round(MEMBER_DISCOUNTS[tier] * 100) : 0;
}
