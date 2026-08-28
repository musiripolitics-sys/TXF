import Link from "next/link";
import { Section, SectionHeading } from "@/components/Section";
import { Icon } from "@/components/Icon";
import { MEMBER_DISCOUNTS } from "@/lib/membership";

/**
 * Membership comparison.
 *
 * This replaced eight equal-weight benefit cards that never showed a price.
 * Comparison is the whole job of a membership section, so the three tiers sit
 * side by side with the prices visible and a shared list of rows — the gaps in
 * the Free column do more work than any adjective.
 *
 * Rows marked `soon` are not enforced yet. They're shown because they're part
 * of the offer, and labelled because printing them as facts would be a lie.
 */

type Row = { label: string; free: boolean; pro: boolean; elite: boolean; soon?: boolean };

const ROWS: Row[] = [
  { label: "Attend any event", free: true, pro: true, elite: true },
  { label: "Ticket and QR check-in", free: true, pro: true, elite: true },
  { label: "Private group for every event you attend", free: true, pro: true, elite: true },
  { label: "Community feed and attendance credits", free: true, pro: true, elite: true },
  { label: "See who's attending, on every event", free: false, pro: true, elite: true },
  { label: "The full member directory", free: false, pro: true, elite: true },
  {
    label: `Member pricing on paid events (${MEMBER_DISCOUNTS.Pro * 100}% Pro, ${MEMBER_DISCOUNTS.Elite * 100}% Elite)`,
    free: false,
    pro: true,
    elite: true,
  },
  { label: "Priority registration on limited seats", free: false, pro: true, elite: true, soon: true },
  { label: "Speaking slots and session hosting", free: false, pro: false, elite: true, soon: true },
  { label: "1:1 mentorship matching", free: false, pro: false, elite: true, soon: true },
  { label: "Chapter leadership", free: false, pro: false, elite: true, soon: true },
];

const TIERS = [
  {
    key: "free" as const,
    name: "Free",
    price: "₹0",
    cadence: "forever",
    tagline: "Come to anything. Always.",
    cta: "Join free",
    href: "/login?mode=signup",
  },
  {
    key: "pro" as const,
    name: "Pro",
    price: "₹499",
    cadence: "per month",
    tagline: "See the room before you walk into it.",
    cta: "Go Pro",
    href: "/membership",
    featured: true,
  },
  {
    key: "elite" as const,
    name: "Elite",
    price: "₹1,499",
    cadence: "per month",
    tagline: "Be someone in the community.",
    cta: "Become Elite",
    href: "/membership",
  },
];

export function Membership() {
  return (
    <Section id="membership">
      <SectionHeading
        eyebrow="Membership"
        title={
          <>
            Attending is always free.{" "}
            <span className="text-brand">Seeing the room isn&rsquo;t.</span>
          </>
        }
        description="Every event stays open to everyone. Membership buys you the people — who's coming, who's in the community, and how to reach them."
      />

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.key}
            className={`relative flex flex-col rounded-2xl border bg-surface p-6 ${
              tier.featured
                ? "border-brand/50 shadow-[0_16px_40px_-24px_rgba(255,90,31,0.5)]"
                : "border-line shadow-soft"
            }`}
          >
            {tier.featured && (
              <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                Most popular
              </span>
            )}

            <h3 className="font-display text-lg font-bold text-fg">{tier.name}</h3>
            <p className="mt-1 text-sm text-muted">{tier.tagline}</p>

            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-bold tracking-tight text-fg">
                {tier.price}
              </span>
              <span className="text-sm text-faint">{tier.cadence}</span>
            </p>

            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {ROWS.map((row) => {
                const on = row[tier.key];
                return (
                  <li
                    key={row.label}
                    className={`flex gap-2 text-sm leading-snug ${
                      on ? "text-muted" : "text-faint/50"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0" aria-hidden>
                      {on ? (
                        <Icon
                          name="check"
                          className={`h-4 w-4 ${tier.featured ? "text-brand" : "text-host-soft"}`}
                          strokeWidth={2.4}
                        />
                      ) : (
                        <span className="block h-4 w-4 text-center leading-4">—</span>
                      )}
                    </span>
                    <span>
                      {row.label}
                      {on && row.soon && (
                        <span className="ml-1.5 rounded-full bg-ink-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
                          Soon
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <Link
              href={tier.href}
              className={`mt-7 block rounded-full px-5 py-3 text-center text-sm font-semibold transition-all ${
                tier.featured
                  ? "bg-brand text-white hover:opacity-90"
                  : "border border-line text-fg hover:border-brand hover:text-brand"
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* No payback claim here on purpose. At 25% off, Pro only breaks even
          against roughly four paid events a month — and the point of the tier
          is what you can see, not what you save. */}
      <p className="mt-8 text-center text-sm text-muted">
        Every event stays open on every tier.{" "}
        <span className="text-faint">
          Cancel any time — you keep your badges, credits and attendance history.
        </span>
      </p>
    </Section>
  );
}
