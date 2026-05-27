import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The & in coding_project&apps breaks webpack's file cache on Windows.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
