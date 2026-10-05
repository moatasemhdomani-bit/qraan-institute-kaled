import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import NoZoom from "@/components/NoZoom";
import { getTheme } from "@/lib/themeServer";
import { THEME_BAR_COLOR } from "@/lib/theme";
import { PWA_BOOT_SCRIPT } from "@/lib/pwa";

export const metadata: Metadata = {
  title: "نظام معهد خالد بن الوليد",
  description: "نظام إدارة معهد الصحابي الجليل خالد بن الوليد",
  applicationName: "معهد خالد بن الوليد",
  // التثبيت كتطبيق على آيفون (إضافة إلى الشاشة الرئيسية) — البيان نفسه في app/manifest.ts
  appleWebApp: { capable: true, title: "معهد خالد", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png?v=3" },
};

/** لون شريط المتصفح وحواف السحب على الجوال — بلون وضع العرض المختار بدل الأبيض */
export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  // منع التكبير (القرص بإصبعين والنقر المزدوج) — حجم الموقع مضبوط أصلًا لكل شاشة
  return {
    themeColor: THEME_BAR_COLOR[theme],
    colorScheme: theme,
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // وضع العرض (داكن / فاتح) محفوظ في ملف تعريف على الجهاز — يُرسم من الخادم مباشرة بلا ومضة
  const theme = await getTheme();
  return (
    <html lang="ar" dir="rtl" data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: PWA_BOOT_SCRIPT }} />
      </head>
      <body>
        <NoZoom />
        {children}
      </body>
    </html>
  );
}
