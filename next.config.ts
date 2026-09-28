import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // الافتراضي 1 ميغابايت فقط — يرفض صور كاميرا الجوال وملفات الشهادات الممسوحة
    serverActions: { bodySizeLimit: "15mb" },
  },
};

export default nextConfig;
