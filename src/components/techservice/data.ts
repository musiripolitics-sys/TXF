/**
 * Copy for /Techservice — TXF's design & development studio page.
 *
 * Kept as data so the section components stay about layout. Anything marked
 * DRAFT below states a business policy and should be confirmed before launch.
 */

export const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://techxfluence.com";

/** Where every "Start a Project" button lands — the enquiry form on the page. */
export const START = "#start-project";

/** The studio header's links (Figma "Nav"). Ids must match the sections' `id`s. */
export const sections = [
  { id: "services", label: "Services" },
  { id: "work", label: "Work" },
  { id: "process", label: "Process" },
  { id: "why-txf", label: "Why TXF" },
  { id: "faq", label: "FAQ" },
  { id: "start-project", label: "Contact" },
] as const;

export const heroChips = ["Website Design", "UI/UX", "Development", "Web Apps", "Branding", "Optimization"] as const;

export const highlights = [
  { value: "8", label: "core services, one studio" },
  { value: "5-step", label: "process, discovery to launch" },
  { value: "100%", label: "responsive, mobile-first builds" },
  { value: "1", label: "team for design + development" },
] as const;

export const capabilities = [
  {
    n: "01",
    title: "Design",
    desc: "UI/UX, branding, marketing assets and visual systems.",
    points: ["Interfaces, identity and design systems", "Campaign and social creative that stays on-brand"],
  },
  {
    n: "02",
    title: "Development",
    desc: "Modern, responsive and scalable websites and web applications.",
    points: ["Any platform — custom code, CMS or e-commerce", "Clean, maintainable builds that scale with you"],
  },
  {
    n: "03",
    title: "Experience",
    desc: "Fast, intuitive and conversion-focused digital experiences.",
    points: ["Performance, accessibility and SEO built in", "Journeys designed around measurable goals"],
  },
] as const;

export const services = [
  { title: "Website Design", desc: "Distinctive, on-brand websites designed around your goals.", icon: "layout" },
  { title: "UI/UX Design", desc: "Research-led interfaces people understand instantly.", icon: "pen" },
  { title: "Website Development", desc: "Clean, scalable builds on modern frameworks.", icon: "code" },
  { title: "Landing Pages", desc: "Focused pages built to convert campaign traffic.", icon: "rocket" },
  { title: "Web Applications", desc: "Dashboards, portals and SaaS products that scale.", icon: "nodes" },
  { title: "Brand & Marketing Assets", desc: "Identity, social and campaign visuals that stay consistent.", icon: "sparkle" },
  { title: "Responsive & Mobile-First", desc: "Built for the phone first, polished on every screen.", icon: "phone" },
  { title: "Maintenance & Optimization", desc: "Updates, speed, SEO and security — handled.", icon: "wrench" },
] as const;

export type Project = {
  name: string;
  category: string;
  services: string;
  /** What the product covers — features, not invented client metrics. */
  includes: string;
  /** Only for shipped work with an outcome we can state. */
  result?: string;
  visual: "platform" | "website" | "commerce" | "crm" | "os";
};

export const projects: Project[] = [
  {
    name: "Techxfluence Platform",
    category: "Community & Events",
    services: "UI/UX Design · Web Application · Development",
    includes: "Event listings, ticketing and payments, QR check-in, memberships, community feed and member directory.",
    result: "Events, ticketing, check-in and memberships — running on one platform.",
    visual: "platform",
  },
  {
    name: "Company Website & Landing Pages",
    category: "Corporate Website",
    services: "Website Design · Development · Landing Pages",
    includes: "A responsive multi-page site, campaign landing pages, an easy CMS for your team, SEO and lead-capture forms.",
    visual: "website",
  },
  {
    name: "End-to-End E-commerce Store",
    category: "E-commerce",
    services: "UI/UX Design · Development · Brand & Marketing Assets",
    includes: "Catalogue, cart and checkout, payments, order management, inventory, marketing campaigns and coupons, and shipping through to delivery tracking.",
    visual: "commerce",
  },
  {
    name: "CRM Application",
    category: "Sales & Customer Management",
    services: "UI/UX Design · Web Application",
    includes: "Leads and contacts, a visual deal pipeline, tasks and follow-ups, team roles and permissions, and sales reports.",
    visual: "crm",
  },
  {
    name: "Business OS",
    category: "Operations Platform",
    services: "UI/UX Design · Web Application · Development",
    includes: "Tasks and approvals, SOPs, performance reviews, team dashboards and role-based access — one workspace to run the business.",
    visual: "os",
  },
];

export const processSteps = [
  { title: "Discover", desc: "Goals, users, research" },
  { title: "Design", desc: "UX, visuals, prototypes" },
  { title: "Develop", desc: "Build, integrate, test" },
  { title: "Launch", desc: "Ship and go live" },
  { title: "Optimize", desc: "Measure and improve" },
] as const;

/**
 * Platforms we work across. Examples, not a limit — the section says so, and
 * every project gets the platform that fits its requirements.
 */
export const platforms = [
  { group: "Websites & CMS", items: ["WordPress", "Webflow", "Framer", "Wix", "Squarespace", "Headless CMS"] },
  { group: "E-commerce", items: ["Shopify", "WooCommerce", "Magento", "BigCommerce", "Custom storefronts"] },
  { group: "Custom development", items: ["React", "Next.js", "Vue", "Angular", "Node.js", "Python", "PHP / Laravel", ".NET"] },
  { group: "Mobile & apps", items: ["Flutter", "React Native", "iOS", "Android", "Progressive web apps"] },
  { group: "Cloud & hosting", items: ["AWS", "Google Cloud", "Azure", "Vercel", "Netlify", "cPanel hosting"] },
  { group: "Design & content", items: ["Figma", "Adobe Creative Cloud", "Canva", "Sketch"] },
] as const;

export const engagements = [
  {
    name: "Project",
    tagline: "A defined build with a clear finish line.",
    bestFor: "New websites, redesigns and landing pages",
    points: ["Fixed scope agreed up front", "Timeline and milestones in the proposal", "Handover and launch support"],
    featured: false,
  },
  {
    name: "Product Partner",
    tagline: "A design + development team on your product.",
    bestFor: "Web applications, MVPs and SaaS",
    points: ["Discovery, UX and build in one team", "Shipped in iterations you can review", "Scales with your roadmap"],
    featured: true,
  },
  {
    name: "Retainer",
    tagline: "Monthly design and development capacity.",
    bestFor: "Growing brands with ongoing needs",
    points: ["Campaign pages and creative on demand", "Maintenance, speed and SEO", "Priority support"],
    featured: false,
  },
] as const;

export const reasons = [
  { title: "Goals before pixels", desc: "Every layout, flow and feature traces back to what your business needs to achieve." },
  { title: "Design + development, one team", desc: "No hand-off gaps — the people who design it are the people who build it." },
  { title: "Built to perform", desc: "Fast load times, clean code, SEO and accessibility from day one." },
  { title: "Here after launch", desc: "Maintenance, updates and optimization so your site keeps getting better." },
] as const;

/** DRAFT — the answers about pricing, timelines and ownership state policy. Confirm before launch. */
export const faqs = [
  {
    q: "Which platforms and technologies do you work with?",
    a: "All the major ones — from WordPress, Shopify and Webflow to fully custom builds in React, Next.js, Laravel or .NET, hosted on AWS, Azure, Google Cloud and more. We don’t push one stack: we recommend the platform that suits your requirements, budget and team, and explain why.",
  },
  {
    q: "How long does a project take?",
    a: "It depends on scope. A landing page is usually a matter of weeks; a full website or web application takes longer. You get a timeline with milestones in our proposal, before any work starts.",
  },
  {
    q: "How much does a website cost?",
    a: "Every project is quoted on its scope. Tell us what you have in mind using the form below — after a short discovery call we send a clear proposal with the cost broken down.",
  },
  {
    q: "Do you work with startups and small businesses?",
    a: "Yes. Much of our work is with early-stage teams and growing businesses that need a strong digital presence without building an in-house team.",
  },
  {
    q: "Can you redesign or improve our existing website?",
    a: "Yes. We can redesign it, rebuild it on a modern stack, or keep what works and focus on speed, SEO and conversion.",
  },
  {
    q: "Will we be able to update the content ourselves?",
    a: "Yes. Where it makes sense we set up a CMS so your team can edit pages, posts and images without touching code.",
  },
  {
    q: "Do you support the site after launch?",
    a: "Yes — through a maintenance and optimization retainer covering updates, security, performance and improvements.",
  },
  {
    q: "Who owns the design and code?",
    a: "You do. Once the project is complete and paid for, the designs, code and accounts are handed over to you.",
  },
] as const;

/** Options for the enquiry form. */
export const budgets = ["Under ₹50,000", "₹50,000 – ₹2,00,000", "₹2,00,000 – ₹5,00,000", "₹5,00,000+", "Not sure yet"] as const;
export const timelines = ["As soon as possible", "Within 1–3 months", "3+ months", "Flexible"] as const;
