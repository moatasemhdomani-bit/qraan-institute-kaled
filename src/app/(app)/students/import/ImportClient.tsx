"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { cardStyle, inputStyle, primaryButtonStyle } from "@/lib/ui";
import Select from "@/components/Select";
import { formatDateAr } from "@/lib/daily";
import { formatMobile } from "@/lib/phone";
import { looseName, type SheetRow } from "@/lib/studentImport";
import { readSheet, previewImport, commitImport, type PreviewRow, type RowStatus } from "./actions";

type Option = { id: string; name: string };

const STATUS_STYLE: Record<RowStatus, { label: string; color: string }> = {
  new: { label: "جديد — يُسجَّل", color: "#6FBF8B" },
  update: { label: "مسجّل — تُحدَّث معلوماته", color: "#D4AF37" },
  same: { label: "مسجّل — بلا تغيير", color: "#8FA8C8" },
  skip: { label: "لن يُمسّ", color: "#E08A8A" },
};

const alertBox = (text: string) => (
  <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{text}</div>
);

export default function ImportClient({ teachers, cohorts }: { teachers: Option[]; cohorts: Option[] }) {
  const [link, setLink] = useState("");
  const [rows, setRows] = useState<SheetRow[] | null>(null);
  const [fileTeacher, setFileTeacher] = useState("");
  const [siteTeacherId, setSiteTeacherId] = useState("");
  const [cohortMap, setCohortMap] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const fileTeachers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows ?? []) counts.set(r.teacher || "(بلا مدرس)", (counts.get(r.teacher || "(بلا مدرس)") ?? 0) + 1);
    return [...counts].sort((a, b) => a[0].localeCompare(b[0], "ar"));
  }, [rows]);

  const inactive = fileTeacher.includes("منقطع");
  const cohortLabels = useMemo(
    () => [...new Set((rows ?? []).filter((r) => r.teacher === fileTeacher).map((r) => r.cohort))],
    [rows, fileTeacher]
  );

  function resetPreview() {
    setPreview(null);
    setConfirming(false);
    setResult(null);
  }

  function load() {
    setError("");
    setRows(null);
    setFileTeacher("");
    resetPreview();
    startTransition(async () => {
      const res = await readSheet(link);
      if ("error" in res) return setError(res.error);
      setRows(res.rows);
    });
  }

  function chooseFileTeacher(t: string) {
    setFileTeacher(t);
    resetPreview();
    // اقتراح تلقائي: المدرس والأفواج بالاسم نفسه في الموقع — تُعدَّل يدويًا عند الحاجة
    setSiteTeacherId(teachers.find((x) => looseName(x.name) === looseName(t))?.id ?? "");
    const labels = [...new Set((rows ?? []).filter((r) => r.teacher === t).map((r) => r.cohort))];
    setCohortMap(Object.fromEntries(labels.map((l) => [l, cohorts.find((c) => looseName(c.name) === looseName(l))?.id ?? ""])));
  }

  function runPreview() {
    if (!rows) return;
    setError("");
    setConfirming(false);
    startTransition(async () => {
      const res = await previewImport(rows, { fileTeacher, siteTeacherId, cohorts: cohortMap });
      if ("error" in res) return setError(res.error);
      setPreview(res.rows);
    });
  }

  function runImport() {
    if (!rows) return;
    setError("");
    startTransition(async () => {
      const res = await commitImport(rows, { fileTeacher, siteTeacherId, cohorts: cohortMap });
      if ("error" in res) return setError(res.error);
      setResult(res);
      setPreview(null);
      setConfirming(false);
    });
  }

  const counts = preview
    ? (Object.fromEntries((["new", "update", "same", "skip"] as const).map((s) => [s, preview.filter((r) => r.status === s).length])) as Record<RowStatus, number>)
    : null;
  const importable = counts ? counts.new + counts.update : 0;
  const label = { display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/students" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
        ← رجوع إلى الطلاب
      </Link>

      {/* ١. رابط الجدول */}
      <div style={{ ...cardStyle, padding: 18, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px" }}>
          <label style={label}>١. رابط جدول Google Sheets</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            dir="ltr"
            placeholder="https://docs.google.com/spreadsheets/d/…"
            style={{ ...inputStyle(), textAlign: "left" }}
          />
        </div>
        <button type="button" onClick={load} disabled={pending || !link.trim()} style={{ ...primaryButtonStyle, opacity: pending || !link.trim() ? 0.7 : 1 }}>
          {pending && !rows ? "جارٍ القراءة…" : "قراءة الجدول"}
        </button>
        <div style={{ width: "100%", fontSize: 12, color: "var(--ink-3)" }}>
          تُقرأ الورقة الأولى («سجل الطلاب»). يجب أن تكون مشاركة الجدول «أي شخص لديه الرابط». أعيدوا القراءة كلما عُدّل الجدول: يُسجَّل الجديد وتُحدَّث معلومات المسجّلين، والخانة الفارغة في الجدول لا تمسح شيئًا.
        </div>
      </div>

      {error && alertBox(error)}

      {result && (
        <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(111,191,139,0.5)", background: "linear-gradient(135deg, rgba(111,191,139,0.16), rgba(111,191,139,0.03))", fontSize: 14 }}>
          تم: سُجّل <b>{result.created}</b> طالبًا جديدًا (لكل منهم حساب ولي أمر) وحُدّثت معلومات <b>{result.updated}</b> طالبًا مسجّلًا.{" "}
          <Link href="/students" style={{ color: "var(--link)" }}>
            عرض الطلاب
          </Link>
        </div>
      )}

      {/* ٢. المقابلة */}
      {rows && (
        <div style={{ ...cardStyle, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
            قُرئ <b style={{ color: "var(--ink)" }}>{rows.length}</b> طالبًا من الجدول. اختاروا المدرس الذي تستوردون طلابه الآن:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
            <div>
              <label style={label}>٢. المدرس في الجدول</label>
              <Select
                value={fileTeacher}
                onChange={chooseFileTeacher}
                options={fileTeachers.map(([t, n]) => ({ value: t, label: `${t} (${n})` }))}
                placeholder="اختر المدرس"
              />
            </div>
            {fileTeacher && !inactive && (
              <div>
                <label style={label}>المدرس المقابل في الموقع</label>
                <Select
                  value={siteTeacherId}
                  onChange={(v) => {
                    setSiteTeacherId(v);
                    resetPreview();
                  }}
                  options={teachers.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="غير مسجّل؟ سجّلوه في إدارة المستخدمين أولًا"
                />
              </div>
            )}
          </div>

          {fileTeacher && inactive && (
            <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>هؤلاء يُستوردون بحالة «منقطع» وبلا حلقة — تبقى بياناتهم محفوظة.</div>
          )}

          {fileTeacher && !inactive && (
            <div>
              <div style={{ ...label, marginBottom: 8 }}>٣. أفواج الجدول ← أفواج الموقع (الحلقة تُحدَّد بالمدرس والفوج معًا)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
                {cohortLabels.map((l) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ minWidth: 70, fontWeight: 600, fontSize: 13.5 }}>«{l || "فارغ"}»</span>
                    <span style={{ color: "var(--ink-3)" }}>←</span>
                    <div style={{ flex: 1 }}>
                      <Select
                        value={cohortMap[l] ?? ""}
                        onChange={(v) => {
                          setCohortMap((m) => ({ ...m, [l]: v }));
                          resetPreview();
                        }}
                        options={cohorts.map((c) => ({ value: c.id, label: c.name }))}
                        placeholder="اختر الفوج"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fileTeacher && (
            <button
              type="button"
              onClick={runPreview}
              disabled={pending || (!inactive && !siteTeacherId)}
              style={{ ...primaryButtonStyle, alignSelf: "flex-start", opacity: pending || (!inactive && !siteTeacherId) ? 0.7 : 1 }}
            >
              {pending && !preview ? "جارٍ الفحص…" : "٤. معاينة"}
            </button>
          )}
        </div>
      )}

      {/* ٣. المعاينة */}
      {preview && counts && (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid var(--line-2)" }}>
            {(["new", "update", "same", "skip"] as const).map((s) => (
              <span key={s} style={{ fontSize: 13 }}>
                <span style={{ color: STATUS_STYLE[s].color, fontWeight: 700 }}>{STATUS_STYLE[s].label}:</span> {counts[s]}
              </span>
            ))}
            <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {!confirming ? (
                <button type="button" disabled={importable === 0} onClick={() => setConfirming(true)} style={{ ...primaryButtonStyle, opacity: importable === 0 ? 0.6 : 1 }}>
                  {importable === 0 ? "لا جديد ولا تغيير" : `تنفيذ: تسجيل ${counts.new} وتحديث ${counts.update}`}
                </button>
              ) : (
                <>
                  <span style={{ fontSize: 13 }}>تسجيل {counts.new} جديدًا وتحديث {counts.update} في الموقع الآن؟</span>
                  <button type="button" disabled={pending} onClick={runImport} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
                    {pending ? "جارٍ التنفيذ…" : "نعم، نفّذ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
                  >
                    تراجع
                  </button>
                </>
              )}
            </div>
          </div>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 980 }}>
              <thead>
                <tr style={{ background: "var(--head-grad)", color: "var(--ink-2)" }}>
                  {["سطر", "الاسم", "الأب", "الأم", "المواليد", "رقم ولي الأمر", "تاريخ التسجيل", "الفوج ← الحلقة", "الحالة"].map((h) => (
                    <th key={h} style={{ padding: 8, textAlign: "start", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.line} style={{ borderTop: "1px solid var(--line-2)", opacity: r.status === "skip" || r.status === "same" ? 0.6 : 1 }}>
                    <td style={{ padding: 8, color: "var(--ink-3)" }}>{r.line}</td>
                    <td style={{ padding: 8, fontWeight: 600 }}>
                      {r.name}
                      {r.orphan && <span style={{ marginInlineStart: 6, fontSize: 11, color: "#8FA8C8" }}>(يتيم)</span>}
                    </td>
                    <td style={{ padding: 8 }}>{r.father || "—"}</td>
                    <td style={{ padding: 8 }}>{r.mother || "—"}</td>
                    <td style={{ padding: 8 }}>{r.birthYear ?? "—"}</td>
                    <td style={{ padding: 8, direction: "ltr", textAlign: "right" }}>{r.phone ? formatMobile(r.phone) : "—"}</td>
                    <td style={{ padding: 8 }}>{r.registered ? formatDateAr(r.registered) : "—"}</td>
                    <td style={{ padding: 8 }}>{r.active ? `${r.cohortLabel || "—"} ← ${r.halqaName ?? "—"}` : "منقطع"}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ color: STATUS_STYLE[r.status].color, fontWeight: 700 }}>{STATUS_STYLE[r.status].label}</div>
                      {r.changes.map((c) => (
                        <div key={c} style={{ fontSize: 11.5, color: "var(--ink)" }}>
                          {c}
                        </div>
                      ))}
                      {r.issues.map((i) => (
                        <div key={i} style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
                          {i}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
