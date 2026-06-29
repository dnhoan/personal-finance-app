import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import withSerwistInit from "@serwist/next";
import { validateEnv } from "./src/lib/env";

validateEnv();

// Versioned cache name source: the git short SHA changes every deploy, so the
// SW's `finance-v${BUILD_ID}` cache names change too and stale bundles are evicted.
function resolveBuildId(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}
process.env.NEXT_PUBLIC_BUILD_ID ??= resolveBuildId();

const withSerwist = withSerwistInit({
  swSrc: "src/sw/index.ts",
  swDest: "public/sw.js",
  // SW + Turbopack dev HMR collide; only register the worker in production builds.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
};

export default withSerwist(nextConfig);
