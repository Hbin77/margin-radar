import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 정적 export → 기존 nginx + Cloudflare 그대로 서빙. data.json은 클라이언트 fetch(매일 갱신).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
