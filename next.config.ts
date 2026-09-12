import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // NOTE: no `output: "standalone"` — that is only for Docker/self-hosting and breaks
  // Vercel's build packaging (missing .next/*.nft.json). Vercel handles output itself.
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(self)" },
          { key: "X-Frame-Options", value: "DENY" }
        ]
      }
    ];
  }
};

export default nextConfig;
