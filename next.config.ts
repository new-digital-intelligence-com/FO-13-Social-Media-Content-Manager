import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * CORS on the API.
   *
   * A published Artifact runs on its own sandboxed origin, so any browser call
   * it makes here is cross-origin. Without these headers the browser blocks the
   * response before the page ever sees it — which looks identical to being
   * blocked by the artifact's own CSP, and makes the two impossible to tell
   * apart. Allowing the origin removes that ambiguity.
   */
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
    ],
  },
};

export default nextConfig;
