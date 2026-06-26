// ─────────────────────────────────────────────
// Techxfluence content / sample data
// Single source of truth for the marketing site.
// ─────────────────────────────────────────────

export const brand = {
  name: "Techxfluence",
  short: "TXF",
  tagline: "Where Technology Meets Influence",
  subTagline: "Connect. Learn. Build. Influence.",
  email: "hello@techxfluence.com",
  location: "Chennai, Tamil Nadu, India",
  socials: [
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "Instagram", href: "https://instagram.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "Discord", href: "https://discord.com" },
    { label: "WhatsApp", href: "https://whatsapp.com" },
  ],
};

export const stats = [
  { value: "5,000+", label: "Community Members" },
  { value: "100+", label: "Events Hosted" },
  { value: "50+", label: "Partners" },
  { value: "20+", label: "Cities" },
];

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
};

export const events: TXFEvent[] = [];

export function getEvent(slug: string): TXFEvent | undefined {
  return events.find((e) => e.slug === slug);
}

/** A sensible default run-of-show derived from the event. */
export function eventAgenda(e: TXFEvent): { when: string; what: string }[] {
  const isHack = e.category === "Hackathon";
  return [
    { when: "Doors open", what: "Registration & check-in" },
    { when: "Kickoff", what: `Welcome & intro to ${e.title}` },
    {
      when: "Main session",
      what: isHack ? "Team formation & hacking begins" : "Talks & deep-dive sessions",
    },
    { when: "Break", what: "Networking & refreshments" },
    {
      when: "Wrap-up",
      what: isHack ? "Demos, judging & prizes" : "Panel, Q&A and closing",
    },
  ];
}

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

export const tiers: Tier[] = [
  {
    name: "Free Member",
    price: "₹0",
    cadence: "forever",
    tagline: "Get plugged into the community.",
    cta: "Join Free",
    perks: [
      "Access to community channels",
      "Entry to select free events",
      "Monthly newsletter & resources",
      "Community badge",
    ],
  },
  {
    name: "Pro Member",
    price: "₹499",
    cadence: "per month",
    tagline: "For builders who show up.",
    highlight: true,
    cta: "Go Pro",
    perks: [
      "Everything in Free",
      "Free entry to most paid events",
      "Priority registration",
      "Member-only workshops",
      "Partner discounts & perks",
      "Exclusive learning resources",
    ],
  },
  {
    name: "Elite Member",
    price: "₹1,499",
    cadence: "per month",
    tagline: "Lead, mentor and get recognised.",
    cta: "Become Elite",
    perks: [
      "Everything in Pro",
      "Leadership & speaking opportunities",
      "1:1 mentorship matching",
      "Featured on the Leadership Board",
      "Early access to launches & sponsors",
      "Annual recognition & certificates",
    ],
  },
];

export type MemberBenefit = {
  title: string;
  desc: string;
  icon: string;
  tag: string;
};

export const memberBenefits: MemberBenefit[] = [
  {
    title: "Free / Discounted Access",
    desc: "Walk into select events on us, or grab member-only pricing on everything else — from meetups to flagship summits.",
    icon: "ticket",
    tag: "Save money",
  },
  {
    title: "Priority Registration",
    desc: "Skip the queue for limited-seat workshops and hackathons. Members register first, every time.",
    icon: "clock",
    tag: "Skip the line",
  },
  {
    title: "Exclusive Events",
    desc: "Member-only sessions, founder dinners and late-night hack nights you won't find anywhere else.",
    icon: "sparkle",
    tag: "Insider access",
  },
  {
    title: "Networking",
    desc: "Curated introductions to founders, engineers, designers and investors who can move your work forward.",
    icon: "nodes",
    tag: "Connections",
  },
  {
    title: "Learning Resources",
    desc: "Templates, session recordings and playbooks from every event — yours to keep and reuse.",
    icon: "book",
    tag: "Level up",
  },
  {
    title: "Partner Discounts",
    desc: "Deals on developer tools, cloud credits and courses from our partner ecosystem.",
    icon: "tag",
    tag: "Perks",
  },
  {
    title: "Leadership Opportunities",
    desc: "Host tracks, mentor peers and represent Techxfluence as a community ambassador.",
    icon: "trophy",
    tag: "Grow",
  },
  {
    title: "Badges & Recognition",
    desc: "Earn points, badges and certificates for everything you contribute to the community.",
    icon: "medal",
    tag: "Status",
  },
];

export type LeaderRole =
  | "Founder"
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

export const leaders: Leader[] = [
  {
    name: "Kumaresan",
    role: "Founder",
    initials: "K",
    city: "Chennai",
    events: 64,
    points: 9820,
    focus: "Vision & Strategy",
    bio: "Leading Techxfluence to build India's strongest community for creators and innovators.",
    image: "/team/kumaresan.png",
  },
  {
    name: "Mahalakshmi",
    role: "Community Lead",
    initials: "M",
    city: "Chennai",
    events: 41,
    points: 7430,
    focus: "Member Experience",
    bio: "Fostering collaboration and growing the Techxfluence volunteer network.",
    image: "/team/mahalakshmi.png",
  },
  {
    name: "Abishek",
    role: "Community Lead",
    initials: "A",
    city: "Bengaluru",
    events: 35,
    points: 6610,
    focus: "Ambassador Relations",
    bio: "Connecting campus leads and driving technology events across chapters.",
    image: "/team/abishek.png",
  },
  {
    name: "Open Coordinator (Chennai)",
    role: "Event Coordinator",
    initials: "+",
    city: "Chennai",
    events: 0,
    points: 0,
    focus: "Event Ops",
    bio: "Join as Event Coordinator to organize hackathons, meetups and tech events.",
    isHiring: true,
  },
  {
    name: "Open Ambassador (Chennai)",
    role: "Ambassador",
    initials: "+",
    city: "Chennai",
    events: 0,
    points: 0,
    focus: "Community Growth",
    bio: "Join as Community Ambassador to lead your local chapter.",
    isHiring: true,
  },
  {
    name: "Open Mentor (Chennai)",
    role: "Mentor",
    initials: "+",
    city: "Chennai",
    events: 0,
    points: 0,
    focus: "Technical Guidance",
    bio: "Join as Tech Mentor to support builders in system design and product.",
    isHiring: true,
  },
  {
    name: "Open Coordinator (Bengaluru)",
    role: "Event Coordinator",
    initials: "+",
    city: "Bengaluru",
    events: 0,
    points: 0,
    focus: "Event Ops",
    bio: "Join as Event Coordinator to organize hackathons, meetups and tech events.",
    isHiring: true,
  },
  {
    name: "Open Ambassador (Bengaluru)",
    role: "Ambassador",
    initials: "+",
    city: "Bengaluru",
    events: 0,
    points: 0,
    focus: "Community Growth",
    bio: "Join as Community Ambassador to lead your local chapter.",
    isHiring: true,
  },
  {
    name: "Open Mentor (Bengaluru)",
    role: "Mentor",
    initials: "+",
    city: "Bengaluru",
    events: 0,
    points: 0,
    focus: "Technical Guidance",
    bio: "Join as Tech Mentor to support builders in system design and product.",
    isHiring: true,
  },
];

export const leaderRoles: LeaderRole[] = [
  "Founder",
  "Community Lead",
  "Event Coordinator",
  "Ambassador",
  "Mentor",
];

export const roleBlurbs: Record<LeaderRole, string> = {
  Founder: "Sets the vision and holds the community together.",
  "Community Lead": "Owns member experience, partnerships and day-to-day momentum.",
  "Event Coordinator": "Plans and runs events end-to-end so they go off without a hitch.",
  Ambassador: "Grows local chapters and represents TXF in their city and campus.",
  Mentor: "Gives time 1:1 to help members learn, build and grow.",
};

export const partnerTypes = [
  "Technology Companies",
  "Startups",
  "Communities",
  "Colleges",
  "Media Partners",
];

// Placeholder partner names rendered as logo chips.
export const partners = [
  "NimbusCloud", "ForgeAI", "StackHaus", "Quantyx", "ByteBazaar",
  "Hexolabs", "Vega Ventures", "CampusOrbit", "DevMint", "PixelForge",
  "OpenLoop", "Nexa Media",
];

export const activities = [
  { title: "Monthly Meetups", desc: "Recurring city meetups across 20+ cities.", accent: "brand" },
  { title: "Hackathons", desc: "Weekend build sprints with real prizes.", accent: "join" },
  { title: "Workshops", desc: "Hands-on, expert-led skill sessions.", accent: "host" },
  { title: "Startup Showcases", desc: "A stage for early teams to launch.", accent: "brand" },
  { title: "Mentorship", desc: "1:1 guidance from senior operators.", accent: "join" },
  { title: "Innovation Challenges", desc: "Monthly contests & open-source bounties.", accent: "host" },
] as const;

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
