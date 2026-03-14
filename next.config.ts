import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  serverExternalPackages: ["discord.js"],
};

export default nextConfig;
