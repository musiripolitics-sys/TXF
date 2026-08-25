import type { MetadataRoute } from "next";
import { getEvents } from "@/lib/events";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://techxfluence.com";

/** Static marketing routes, highest priority first. */
const STATIC: { path: string; priority: number; freq: "daily" | "weekly" | "monthly" }[] = [
  { path: "", priority: 1, freq: "daily" },
  { path: "/events", priority: 0.9, freq: "daily" },
  { path: "/membership", priority: 0.8, freq: "weekly" },
  { path: "/host", priority: 0.7, freq: "weekly" },
  { path: "/leaders", priority: 0.6, freq: "weekly" },
  { path: "/about", priority: 0.5, freq: "monthly" },
  { path: "/careers", priority: 0.5, freq: "monthly" },
  { path: "/contact", priority: 0.4, freq: "monthly" },
  { path: "/legal/terms", priority: 0.2, freq: "monthly" },
  { path: "/legal/handbook", priority: 0.2, freq: "monthly" },
  { path: "/legal/organizer-agreement", priority: 0.2, freq: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const pages: MetadataRoute.Sitemap = STATIC.map((s) => ({
    url: `${SITE}${s.path}`,
    lastModified: now,
    changeFrequency: s.freq,
    priority: s.priority,
  }));

  // Published, upcoming events — the pages that actually earn search traffic.
  try {
    const events = await getEvents();
    for (const e of events) {
      pages.push({
        url: `${SITE}/events/${e.slug}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
      });
    }
  } catch {
    /* DB unreachable — still serve the static routes */
  }

  return pages;
}
