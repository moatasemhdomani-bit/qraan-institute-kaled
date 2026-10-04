import type { MetadataRoute } from "next";

/** بيان التطبيق — يجعل الموقع قابلًا للتثبيت على الجوال والحاسوب بأيقونة المعهد وبلا شريط متصفح. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "معهد خالد بن الوليد",
    short_name: "معهد خالد",
    description: "نظام إدارة معهد الصحابي الجليل خالد بن الوليد",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a192f",
    theme_color: "#0a192f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
