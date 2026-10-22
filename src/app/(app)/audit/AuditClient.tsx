"use client";

import { useMemo, useState } from "react";
import { cardStyle, inputStyle } from "@/lib/ui";
import Select from "@/components/Select";
import DateField from "@/components/DateField";
import { textHas } from "@/lib/search";

type Row = { id: string; who: string; what: string; when: string; /** YYYY-MM-DD بتوقيت دمشق */ day: string };
type StudentRow = { id: string; name: string; no: number };

/** أنواع العمليات — تُستنتج من نص الإجراء، بالترتيب (أول نوع ينطبق) */
const OPS: { id: string; label: string; test: (t: string) => boolean }[] = [
  { id: "report", label: "تقرير", test: (t) => t.includes("تقرير") },
  { id: "stars", label: "نجوم", test: (t) => /نجم|نجوم/.test(t) },
  { id: "exam", label: "سبر", test: (t) => /سبر|ترشيح|شهادة|شهادات|دفعة/.test(t) },
  { id: "recitation", label: "تسميع", test: (t) => /تسميع|الماضي|الإعداد الأول/.test(t) },
  { id: "attendance", label: "حضور", test: (t) => t.includes("حضور") },
  { id: "status", label: "تعديل حالة", test: (t) => /حالة|منقطع|«نشط»|علّق|تعليق|ترفّع|فرز|نقل|سلوك|أيام الدوام|توقيت|نوع الحلقة/.test(t) },
  { id: "create", label: "إنشاء", test: (t) => /^(أضاف|أنشأ|سجّل|استيراد|ولّد|أسند)/.test(t) },
];
const opOf = (t: string) => OPS.find((o) => o.test(t))?.id ?? "other";

export default function AuditClient({ rows, students, limit }: { rows: Row[]; students: StudentRow[]; limit: number }) {
  const [who, setWho] = useState("all");
  const [student, setStudent] = useState("");
  const [op, setOp] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // الطالب يُعرف في السجل برقمه (#1002) أو باسمه في الأسطر القديمة
  // البحث بالكتابة: اسم الطالب (أو جزء منه) أو رقمه
  const q = student.trim().replace(/^#/, "");
  const matched = useMemo(
    () => (q ? students.filter((s) => textHas(s.name, q) || String(s.no) === q) : []),
    [students, q]
  );
  const mentions = (r: Row, s: StudentRow) => r.what.includes(`#${s.no}`) || r.what.includes(`«${s.name}»`);

  const byWho = (r: Row) => who === "all" || r.who === who;
  const byStudent = (r: Row) => {
    if (!q) return true;
    return textHas(r.what, q) || matched.some((s) => mentions(r, s));
  };
  const byOp = (r: Row) => op === "all" || opOf(r.what) === op;
  const byDate = (r: Row) => (!from || r.day >= from) && (!to || r.day <= to);

  const filtered = useMemo(() => rows.filter((r) => byWho(r) && byStudent(r) && byOp(r) && byDate(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, who, q, matched, op, from, to]);

  // خيارات كل قائمة بعدد ما ينطبق عليه (ضمن بقية الفلاتر)
  const whoOptions = useMemo(() => {
    const base = rows.filter((r) => byStudent(r) && byOp(r) && byDate(r));
    const counts = new Map<string, number>();
    for (const r of base) counts.set(r.who, (counts.get(r.who) ?? 0) + 1);
    return [
      { value: "all", label: "كل الموظفين" },
      ...[...counts].sort((a, b) => a[0].localeCompare(b[0], "ar")).map(([n]) => ({ value: n, label: n })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, matched, op, from, to]);

  const opOptions = useMemo(() => {
    const base = rows.filter((r) => byWho(r) && byStudent(r) && byDate(r));
    return [
      { value: "all", label: "كل العمليات" },
      ...OPS.map((o) => ({ value: o.id, label: o.label })),
      { value: "other", label: "أخرى" },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, who, q, matched, from, to]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
          <Select value={who} onChange={setWho} options={whoOptions} />
          <input value={student} onChange={(e) => setStudent(e.target.value)} placeholder="ابحث باسم الطالب أو رقمه…" style={inputStyle()} />
          <Select value={op} onChange={setOp} options={opOptions} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <DateField label="من تاريخ" value={from} onChange={setFrom} width={160} />
          <DateField label="إلى تاريخ" value={to} onChange={setTo} width={160} />
          {(who !== "all" || q || op !== "all" || from || to) && (
            <button
              type="button"
              onClick={() => {
                setWho("all");
                setStudent("");
                setOp("all");
                setFrom("");
                setTo("");
              }}
              style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              مسح الفلاتر
            </button>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
          عدد النتائج: {filtered.length}
          {rows.length >= limit && <span style={{ color: "var(--ink-3)", fontWeight: 400 }}> — من آخر {limit} عملية</span>}
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{rows.length === 0 ? "السجل فارغ" : "لا نتائج مطابقة"}</div>
            <div style={{ color: "var(--ink-2)", fontSize: 13, maxWidth: 420, margin: "0 auto" }}>
              {rows.length === 0 ? "يبدأ السجل فارغًا ويتراكم مع أول عملية." : "لا عمليات مطابقة لهذه الفلاتر."}
            </div>
          </div>
        ) : (
          <>
            <div className="list-table-wrap">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr 1fr",
                  gap: 12,
                  padding: "11px 16px",
                  background: "var(--head-grad)",
                  fontSize: 12,
                  color: "var(--ink-2)",
                  fontWeight: 600,
                  minWidth: 560,
                }}
              >
                <div>الفاعل</div>
                <div>الإجراء</div>
                <div>الوقت</div>
              </div>
              {filtered.map((a) => (
                <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 12, padding: "13px 16px", borderTop: "1px solid var(--line-2)", fontSize: 14, alignItems: "center", minWidth: 560 }}>
                  <div>{a.who}</div>
                  <div style={{ color: "var(--ink-2)", fontSize: 13 }}>{a.what}</div>
                  <div style={{ color: "var(--ink-3)", fontSize: 13 }}>{a.when}</div>
                </div>
              ))}
            </div>

            <div className="list-cards">
              {filtered.map((a) => (
                <div key={a.id} style={{ padding: "13px 14px", borderTop: "1px solid var(--line-2)", display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{a.who}</span>
                    <span style={{ marginInlineStart: "auto", fontSize: 12, color: "var(--ink-3)" }}>{a.when}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{a.what}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
