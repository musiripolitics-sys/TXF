/**
 * Shared vocabulary: brand constants, enums and the shapes content is read
 * into. Not content itself.
 *
 * This file used to hold the content too — ten leaders with bios and point
 * totals, three priced membership tiers, eight perks, six activity cards —
 * and lib/content.ts served those arrays whenever the matching table came
 * back empty. Every one of those tables WAS empty, so the live site showed
 * all of it, and editing the database changed nothing. The content now lives
 * in leader_profiles, membership_plans, plan_benefits, benefits and
 * activities, where it can be edited; an empty table is an empty section.
 *
 * What stays here is what is not content: the brand record, the category and
 * role enums that the database columns are typed against, the stat labels
 * that name the numbers public_stats() returns, and the marketing copy on the
 * static pages that has no table behind it.
 */
// ─────────────────────────────────────────────
// Techxfluence content / sample data
// Single source of truth for the marketing site.
// ─────────────────────────────────────────────

export const brand = {
  name: "Techxfluence",
  short: "TXF",
  tagline: "Where Technology Meets Influence",
  subTagline: "Connect. Learn. Build. Influence.",
  email: "admin@techxfluence.com",
  location: "Chennai, Tamil Nadu, India",
  socials: [
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "Instagram", href: "https://instagram.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "Discord", href: "https://discord.com" },
  ],
};

/** Labels for the homepage statistics. The values come from the database
 *  via getStats(); they used to be hardcoded claims the data did not support. */
export const statLabels = [
  { key: "members",  label: "Community Members" },
  { key: "events",   label: "Events Hosted" },
  { key: "partners", label: "Partners" },
  { key: "cities",   label: "Cities" },
] as const;

export type EventCategory =
  | "Meetup"
  | "Workshop"
  | "Webinar"
  | "Hackathon"
  | "Conference"
  | "Networking"
  | "Product Launch";

export type Speaker = { name: string; role: string; initials: string };

export type TXFEvent = {
  id?: string;
  slug: string;
  title: string;
  category: EventCategory;
  date: string; // ISO
  dateLabel: string;
  time: string;
  city: string;
  venue: string;
  address: string;
  price: "Free" | "Paid";
  priceLabel: string;
  blurb: string;
  about: string;
  spotsLeft: number;
  capacity: number;
  speakers: Speaker[];
  agenda?: { when: string; what: string }[];
  image?: string;
  hostName?: string;
  hostId?: string;
  communityId?: string;
  tags?: string[];
  highlights?: string[];
  refundPolicy?: string;
  latitude?: number;
  longitude?: number;
  startsAt?: string;
  endsAt?: string;
  ticketTypes?: TicketType[];
  questions?: EventQuestion[];
};

/** A custom question the organiser asks at registration. */
export type EventQuestion = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  required: boolean;
};

/** A purchasable tier on an event (Early Bird / Regular / VIP …). */
export type TicketType = {
  id: string;
  name: string;
  description?: string;
  priceAmount: number; // paise; 0 = free tier
  priceLabel: string;
  available: number; // capacity - sold
  maxPerOrder: number;
  salesEnded: boolean;
  salesNotStarted: boolean;
};

export const eventCategories: EventCategory[] = [
  "Meetup",
  "Workshop",
  "Webinar",
  "Hackathon",
  "Conference",
  "Networking",
  "Product Launch",
];

/** Per-category poster theme — gradient, icon and label used to render
 *  a distinct "poster" for every category (workshop, webinar, etc.). */
export const categoryTheme: Record<
  EventCategory,
  { from: string; to: string; icon: string; label: string }
> = {
  Meetup: { from: "#ff7a2f", to: "#b3340a", icon: "coffee", label: "MEETUP" },
  Workshop: { from: "#18b85a", to: "#0a5e36", icon: "wrench", label: "WORKSHOP" },
  Webinar: { from: "#22b8cf", to: "#0b5563", icon: "broadcast", label: "WEBINAR" },
  Hackathon: { from: "#8b5cf6", to: "#4310a0", icon: "code", label: "HACKATHON" },
  Conference: { from: "#3b82f6", to: "#0f3b8c", icon: "mic", label: "CONFERENCE" },
  Networking: { from: "#ec4899", to: "#831843", icon: "nodes", label: "NETWORKING" },
  "Product Launch": { from: "#f59e0b", to: "#92400e", icon: "rocket", label: "LAUNCH" },
};

export type Tier = {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  highlight?: boolean;
  cta: string;
  perks: string[];
};

export type MemberBenefit = {
  title: string;
  desc: string;
  icon: string;
  tag: string;
};

export type LeaderRole =
  | "Founder"
  | "Manager"
  | "Community Lead"
  | "Event Coordinator"
  | "Ambassador"
  | "Mentor";

export type Leader = {
  name: string;
  role: LeaderRole;
  initials: string;
  city: string;
  events: number;
  points: number;
  bio: string;
  focus: string;
  linkedin?: string;
  isHiring?: boolean;
  image?: string;
};

/** LinkedIn profile URL for a leader (explicit field, or a slug fallback). */
export function leaderLinkedIn(leader: Leader): string {
  if (leader.isHiring) return "/membership";
  return (
    leader.linkedin ??
    `https://www.linkedin.com/in/${leader.name.toLowerCase().replace(/\s+/g, "-")}`
  );
}

export const partnerTypes = [
  "Technology Companies",
  "Startups",
  "Communities",
  "Colleges",
  "Media Partners",
];

// Partner names rendered as logo chips. Deliberately empty: this used to
// hold twelve invented companies, which appeared on pages that take money.
// Real partners belong in the `partners` table, which getPartners() reads;
// the marquee hides itself when there are none.
export const impactSteps = [
  { title: "Connect", sub: "People" },
  { title: "Learn", sub: "New Skills" },
  { title: "Build", sub: "Innovations" },
  { title: "Collaborate", sub: "& Grow" },
  { title: "Create Impact", sub: "Together" },
];

// Host-an-event pipeline (from the platform flow).
export const hostSteps = [
  { title: "Event Submission", desc: "Fill in event details — date, venue, category and format." },
  { title: "Review & Approval", desc: "Our team reviews feasibility and confirms your slot." },
  { title: "Event Goes Live", desc: "Your listing publishes on the platform and opens for registration." },
  { title: "Promotion & Support", desc: "We promote across channels and support you end-to-end." },
  { title: "Manage Event", desc: "Track registrations, attendees, check-ins and analytics." },
];
