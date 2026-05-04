import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  // Server Actions ship FormData (incl. uploaded files) through Next's
  // RPC layer. Default cap is 1 MB which silently rejects most phone
  // photos. We accept up to 20 MB per file (MAX_ORDER_FILE_SIZE), so
  // bump the limit accordingly to cover one or two large attachments.
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    remotePatterns: [
      // Allow images served from Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
