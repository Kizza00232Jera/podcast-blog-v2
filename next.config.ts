import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
};

// register + a new service worker on every build, and DON'T aggressively cache
// front-end navigations — that was serving the installed PWA a stale build
// (e.g. an old header). The SW still precaches static assets for offline use.
export default withPWA({
  dest: "public",
  register: true,
  reloadOnOnline: true,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
