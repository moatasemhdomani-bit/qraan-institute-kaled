import puppeteer from "puppeteer-core";
import { existsSync } from "fs";
import { execSync } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

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

/** يبحث عن اسم برنامج ضمن PATH (يغطي حالات مثل Nixpacks على Railway، حيث الاسم متاح بلا مسار ثابت). */
function resolveOnPath(cmd: string): string | null {
  try {
    const which = process.platform === "win32" ? "where" : "which";
    const out = execSync(`${which} ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const first = out.split(/\r?\n/)[0]?.trim();
    return first && existsSync(first) ? first : null;
  } catch {
    return null;
  }
}

function findBrowser(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const found = CANDIDATE_BROWSERS.find((p) => existsSync(p));
  if (found) return found;
  for (const cmd of ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "msedge"]) {
    const resolved = resolveOnPath(cmd);
    if (resolved) return resolved;
  }
  throw new Error("لا يوجد متصفح Chrome أو Edge مثبَّت على الجهاز — لازم لتصدير التقارير PDF.");
}

/** يحوّل صفحة HTML كاملة (مستقلة، بلا حاجة لجلسة أو كوكيز) إلى ملف PDF عبر متصفح خفي. */
export async function renderPdf(html: string, landscape = false): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    // لازم داخل حاويات Linux تعمل بصلاحية root (كما على Railway) — بلا هذا يفشل تشغيل Chrome عادة.
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
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

/** يحفظ ملف PDF مولَّد في public/uploads/reports ويُرجع رابطه — نسخة مجمّدة لا تُعاد كتابتها. */
export async function saveReportPdf(buf: Buffer): Promise<string> {
  const filename = `report-${crypto.randomUUID()}.pdf`;
  const dir = path.join(process.cwd(), "public", "uploads", "reports");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buf);
  return `/uploads/reports/${filename}`;
}
