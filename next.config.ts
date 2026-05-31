import type { NextConfig } from "next";
import { validateEnv } from "./src/lib/env";

validateEnv();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
