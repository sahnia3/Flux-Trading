import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      root: __dirname, // ensure turbopack uses frontend/ as root
    },
  },
};

export default nextConfig;
