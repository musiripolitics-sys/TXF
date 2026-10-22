import type { NextConfig } from "next";

/**
 * Event covers are uploaded to this project's Supabase storage, so next/image
 * has to be told that host is allowed. Without it, the first cover anyone sets
 * does not render badly — it throws, and takes the events listing with it,
 * because EventCard optimizes whatever is in image_url.
 *
 * Read from the env var rather than hardcoded: the project ref differs
 * between this project and any fork of it, and a wrong literal here fails at
 * runtime on a page nobody tested.
 */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },

  async redirects() {
    return [
      // A friendlier alias for the TXF studio page.
      { source: "/tech-services", destination: "/Techservice", permanent: true },

      // The /admin/os and /admin/platform redirects are gone with Shreex: it
      // lives in its own repository, on its own domain, against its own
      // database. A redirect here would point at a route this app does not
      // have, which is worse than a 404 because it looks deliberate.
    ];
  },
};

export default nextConfig;
