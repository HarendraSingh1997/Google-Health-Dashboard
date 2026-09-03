import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake barrel imports so only used icons/chart/table modules ship.
    optimizePackageImports: ["lucide-react", "recharts", "@tanstack/react-table", "lodash"],
  },
};

export default nextConfig;
