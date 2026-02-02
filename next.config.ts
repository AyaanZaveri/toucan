import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Removed output: "export" to enable server-side features (API routes/proxy)
  // Keep images unoptimized for now
  images: { unoptimized: true },
}

export default nextConfig
