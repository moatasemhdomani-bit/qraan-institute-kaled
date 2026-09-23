import puppeteer, { type LaunchOptions } from "puppeteer-core";
import { existsSync } from "fs";
import crypto from "crypto";
import { uploadFile } from "./storage";

const CANDIDATE_BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
];

/** متصفح مثبَّت محليًا (جهاز التطوير) — أسرع، بلا تنزيل. */
function findLocalBrowser(): string | null {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  return CANDIDATE_BROWSERS.find((p) => existsSync(p)) ?? null;
}

function launchOptions(): LaunchOptions & { executablePath: string; args: string[] } {
  const local = findLocalBrowser();
  if (!local) {
    throw new Error("لا يوجد متصفح Chrome أو Edge أو Chromium مثبَّت على الجهاز — لازم لتصدير التقارير PDF.");
  }
  return { executablePath: local, headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] };
}

/** يحوّل صفحة HTML كاملة (مستقلة، بلا حاجة لجلسة أو كوكيز) إلى ملف PDF عبر متصفح خفي. */
export async function renderPdf(html: string, landscape = false): Promise<Buffer> {
  const browser = await puppeteer.launch(launchOptions());
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const buf = await page.pdf({
      format: "A4",
      landscape,
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

/** يحفظ ملف PDF مولَّد في دلو التخزين ويُرجع رابطه — نسخة مجمّدة لا تُعاد كتابتها. */
export async function saveReportPdf(buf: Buffer): Promise<string> {
  const key = `reports/report-${crypto.randomUUID()}.pdf`;
  return uploadFile(key, buf, "application/pdf");
}
