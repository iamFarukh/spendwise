import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@pfos/shared"],
  turbopack: {
    root: path.join(rootDir, ".."),
  },
};

export default nextConfig;
