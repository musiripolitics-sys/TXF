import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
