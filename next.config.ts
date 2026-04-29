import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  images: {
    remotePatterns: [
      // Allow images served from Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
