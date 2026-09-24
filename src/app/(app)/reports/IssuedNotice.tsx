"use client";

import { useState } from "react";

type SaveFilePicker = (opts: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>;

const btn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 9,
  border: "1px solid var(--line)",
  background: "var(--btn-soft)",
  color: "var(--ink)",
  fontSize: 13,
  fontFamily: "inherit",
  textDecoration: "none",
  cursor: "pointer",
};

/** رسالة «تم الإصدار» مع زرّي فتح PDF وتنزيله (تنزيل يفتح نافذة اختيار مكان الحفظ حين يدعمها المتصفح). */
export default function IssuedNotice({ reportId, name, duplicate }: { reportId: string; name: string; duplicate?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pdfUrl = `/reports/${reportId}/pdf`;
  const fileName = `${name.trim() || "تقرير"}.pdf`;

  async function download() {
    setErr("");
    const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
    if (!picker) {
      // متصفحات بلا نافذة حفظ برمجية (فايرفوكس/الجوال): تنزيل عادي بالاسم المقترح
      const a = document.createElement("a");
      a.href = `${pdfUrl}?download=1`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    let handle;
    try {
      // تُفتح نافذة الحفظ أولًا (تتطلّب نقرة المستخدم مباشرة)، ثم يُولَّد الملف ويُكتب فيها
      handle = await picker({ suggestedName: fileName, types: [{ description: "ملف PDF", accept: { "application/pdf": [".pdf"] } }] });
    } catch {
      return; // ألغى المستخدم نافذة الحفظ
    }
    setBusy(true);
    try {
      const res = await fetch(`${pdfUrl}?download=1`);
      if (!res.ok) throw new Error(await res.text());
      const writable = await handle.createWritable();
      await writable.write(await res.blob());
      await writable.close();
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "تعذّر تنزيل الملف.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 11,
        border: "1px solid var(--line)",
        background: "var(--card-2-grad)",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <span style={{ flex: "1 1 220px" }}>
        {duplicate ? "يوجد تقرير سابق بنفس المعطيات في السجل — لم يُكرَّر." : "تم إصدار التقرير وحُفظ في السجل."}
      </span>
      <a href={pdfUrl} target="_blank" rel="noreferrer" style={btn}>
        فتح PDF
      </a>
      <button type="button" onClick={download} disabled={busy} style={{ ...btn, opacity: busy ? 0.7 : 1 }}>
        {busy ? "جارٍ التنزيل…" : "تنزيل PDF"}
      </button>
      {err && <span style={{ width: "100%", fontSize: 12, color: "#E08A8A" }}>{err}</span>}
    </div>
  );
}
