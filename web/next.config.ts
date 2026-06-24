import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@pfos/shared"],
  turbopack: {
    root: path.join(rootDir, ".."),
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Tree-shake large libraries down to only the imports actually used.
    optimizePackageImports: ["firebase", "lottie-react"],
  },
};

export default nextConfig;
