import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  // Server Actions only carry small JSON/text payloads now — files
  // upload to Supabase Storage directly from the browser via signed
  // URLs (see src/components/AttachmentUploader.tsx). The default 1 MB
  // is plenty for form metadata, but we keep a conservative 4 MB to
  // accommodate large item lists or many sized breakdowns.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
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
