import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // تجربة النسخة المحلية من جوال على نفس شبكة الـWi-Fi (خادم التطوير فقط — لا أثر له على Railway)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  experimental: {
    // الافتراضي 1 ميغابايت فقط — يرفض صور كاميرا الجوال وملفات الشهادات الممسوحة
    serverActions: { bodySizeLimit: "15mb" },
  },
};

export default nextConfig;
