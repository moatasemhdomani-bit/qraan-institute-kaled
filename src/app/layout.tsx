import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getTheme } from "@/lib/themeServer";
import { THEME_BAR_COLOR } from "@/lib/theme";

export const metadata: Metadata = {
  title: "نظام معهد خالد بن الوليد",
  description: "المرحلة الأولى: العاملون، الأفواج، الحلقات، والطلاب.",
};

/** لون شريط المتصفح وحواف السحب على الجوال — بلون وضع العرض المختار بدل الأبيض */
export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return { themeColor: THEME_BAR_COLOR[theme], colorScheme: theme };
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
      </head>
      <body>{children}</body>
    </html>
  );
}
