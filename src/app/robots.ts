import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / authenticated areas have nothing to index.
      disallow: [
        "/admin",
        "/host/dashboard",
        "/host/checkin",
        "/profile",
        "/account",
        "/community",
        "/directory",
        "/api/",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
