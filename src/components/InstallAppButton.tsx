"use client";

import { useEffect, useState, type CSSProperties } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type PwaWindow = Window & { __khsInstall?: InstallPrompt | null };

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * زر «تثبيت التطبيق»: يظهر فقط حين يمكن تثبيت الموقع كتطبيق على هذا الجهاز ولم يُثبَّت بعد.
 * على آيفون لا يوجد تثبيت مباشر من الصفحة، فيشرح الخطوة من زر المشاركة في Safari.
 */
export default function InstallAppButton({ compact = false, style }: { compact?: boolean; style?: CSSProperties }) {
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios">("hidden");

  useEffect(() => {
    const w = window as PwaWindow;
    const sync = () => {
      if (isStandalone()) setMode("hidden");
      else if (w.__khsInstall) setMode("prompt");
      else if (isIos()) setMode("ios");
      else setMode("hidden");
    };
    sync();
    window.addEventListener("khs-installable", sync);
    return () => window.removeEventListener("khs-installable", sync);
  }, []);

  if (mode === "hidden") return null;

  async function install() {
    const w = window as PwaWindow;
    if (mode === "ios" || !w.__khsInstall) {
      alert("لتثبيت التطبيق على آيفون:\n١. افتح الموقع في Safari\n٢. اضغط زر المشاركة ⬆︎ أسفل الشاشة\n٣. اختر «إضافة إلى الشاشة الرئيسية»");
      return;
    }
    const prompt = w.__khsInstall;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      w.__khsInstall = null;
      window.dispatchEvent(new Event("khs-installable"));
    }
  }

  return (
    <button
      type="button"
      onClick={install}
      title="تثبيت التطبيق على هذا الجهاز"
      style={{
        width: "100%",
        padding: compact ? "6px 4px" : 7,
        borderRadius: 8,
        border: "1px solid var(--gold)",
        background: "transparent",
        color: "var(--gold)",
        fontSize: compact ? 10 : 12,
        fontFamily: "inherit",
        cursor: "pointer",
        ...style,
      }}
    >
      {compact ? "⤓ تثبيت" : "⤓ تثبيت التطبيق"}
    </button>
  );
}
