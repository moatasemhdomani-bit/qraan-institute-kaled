"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cardStyle, chipStyle, inputStyle, primaryButtonStyle, softButtonStyle } from "@/lib/ui";
import { formatDateAr } from "@/lib/daily";
import { textHas } from "@/lib/search";
import { CERTIFICATE_CHOICES, CERTIFICATE_KINDS, CERTIFICATE_LABELS, CERTIFICATE_RULES, type CertificateKindId } from "@/lib/certificate";
import type { CertificateCandidate } from "@/lib/certificateServer";
import { issueCertificates, addPriorCertificate, deletePriorCertificate } from "./actions";
import Drawer from "@/components/Drawer";
import NumberField from "@/components/NumberField";

/** طالب مسجّل — لـ«شهادة سابقة»: بياناته تُملأ في الشهادة تلقائيًا */
type PriorStudent = { id: string; no: number; name: string; nasabName: string; father: string; birthPlace: string; birthYear: string };

const pdfUrl = (ids: string[]) => `/exams/awqaf-batches/certificates/pdf?ids=${ids.join(",")}&download=1`;

/**
 * «شهادات المعهد»: خياران (قراءة عربية / عمّ غيباً) ← الطلاب الناجحون في سبره ← اختيار طالب أو الكل ← «تنزيل PDF»
 * (ملف واحد فيه شهادات المحدَّدين، كل شهادة في صفحة). من لم تصدر شهادته تُنشأ له برقم جديد عند التنزيل.
 */
export default function CertificatesClient({ candidates, students }: { candidates: Record<CertificateKindId, CertificateCandidate[]>; students: PriorStudent[] }) {
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const [kind, setKind] = useState<CertificateKindId | null>(null);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const all = kind ? candidates[kind] : [];
  const rows = useMemo(
    () =>
      all
        .filter((c) => !q.trim() || textHas(c.name, q.trim()) || String(c.no) === q.trim())
        // «لم تنزل بعد» أول القائمة، ثم النازلة — وداخل كلٍّ بالاسم كما رتّبها الخادم
        .sort((a, b) => Number(!!a.cert) - Number(!!b.cert)),
    [all, q]
  );
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.studentId));

  function open(k: CertificateKindId | null) {
    setKind(k);
    setQ("");
    setPicked(new Set());
    setError("");
    setAdding(false);
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function download() {
    if (!kind) return;
    setError("");
    const ids = all.filter((c) => picked.has(c.studentId)).map((c) => c.studentId);
    startTransition(async () => {
      const res = await issueCertificates(kind, ids);
      if (res.error || !res.ids) return setError(res.error ?? "تعذّر تجهيز الشهادات.");
      // ملف مرفق (attachment): يبدأ التنزيل وتبقى الصفحة كما هي
      window.location.href = pdfUrl(res.ids);
      router.refresh();
    });
  }

  if (!kind) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {CERTIFICATE_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => open(k)}
            style={{ ...cardStyle, padding: "22px", textAlign: "start", cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>{CERTIFICATE_CHOICES[k]}</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
              {CERTIFICATE_LABELS[k]} — للناجحين في {CERTIFICATE_RULES[k]}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 8 }}>الناجحون: {candidates[k].length}</div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => open(null)} style={softButtonStyle}>
          ← رجوع
        </button>
        {CERTIFICATE_KINDS.map((k) => (
          <button key={k} type="button" onClick={() => open(k)} style={chipStyle(k === kind)}>
            {CERTIFICATE_CHOICES[k]}
          </button>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: "14px 18px" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{CERTIFICATE_LABELS[kind]}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, marginBottom: 12 }}>
          الطلاب الناجحون في {CERTIFICATE_RULES[kind]} — اختاروا طالبًا أو أكثر، أو «اختيار الكل».
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inputStyle(), flex: "1 1 220px", width: "auto" }} placeholder="بحث باسم الطالب أو رقمه" />
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setPicked((prev) => {
                  const next = new Set(prev);
                  for (const r of rows) {
                    if (allPicked) next.delete(r.studentId);
                    else next.add(r.studentId);
                  }
                  return next;
                })
              }
              style={chipStyle(allPicked)}
            >
              {allPicked ? "إلغاء اختيار الكل" : "اختيار الكل"}
            </button>
          )}
          <button type="button" onClick={() => setAdding(true)} style={softButtonStyle}>
            + شهادة سابقة
          </button>
          <button
            type="button"
            disabled={picked.size === 0 || pending}
            onClick={download}
            style={{ ...primaryButtonStyle, opacity: picked.size === 0 || pending ? 0.6 : 1 }}
          >
            {pending ? "جارٍ التجهيز…" : `تنزيل PDF${picked.size ? ` (${picked.size})` : ""}`}
          </button>
        </div>

        <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 6 }}>
          عدد النتائج: <b style={{ color: "var(--ink)", fontSize: 15 }}>{rows.length}</b>
          {picked.size > 0 && <span> · المحدَّدون: <b style={{ color: "var(--ink)" }}>{picked.size}</b></span>}
        </div>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13, marginBottom: 8 }}>
            {error}
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)" }}>
            {all.length === 0 ? "لا يوجد طلاب ناجحون في هذا السبر بعد." : "لا نتائج تطابق البحث."}
          </div>
        ) : (
          rows.map((r) => (
            <label
              key={r.studentId}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderTop: "1px solid var(--line-2)", cursor: "pointer", flexWrap: "wrap" }}
            >
              <input type="checkbox" checked={picked.has(r.studentId)} onChange={() => toggle(r.studentId)} style={{ width: 18, height: 18, accentColor: "var(--gold)" }} />
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {r.name} <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: 12.5 }}>#{r.no}</span>
                  {r.prior && <span style={{ color: "var(--gold)", fontSize: 12, marginInlineStart: 6 }}>شهادة سابقة</span>}
                  {!r.active && <span style={{ color: "var(--bad)", fontSize: 12, marginInlineStart: 6 }}>منقطع</span>}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}>
                  {r.halqa ? `${r.halqa} · ` : ""}{r.prior ? "صدرت ورقيًا" : `نجح بتاريخ ${formatDateAr(r.examDate)}`}
                  {r.mark != null ? ` · ${r.mark} / 100` : ""}
                </div>
              </div>
              <span style={{ fontSize: 12, color: r.cert ? "var(--ok-ink)" : "var(--ink-3)" }}>
                {r.cert ? `شهادة رقم ${r.cert.number} · ${formatDateAr(r.cert.date)}` : "لم تنزل بعد"}
              </span>
              {r.prior && r.cert && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={(e) => {
                    e.preventDefault();
                    const certId = r.cert!.id;
                    if (!window.confirm(`حذف الشهادة السابقة رقم ${r.cert!.number} للطالب «${r.name}»؟`)) return;
                    startTransition(async () => {
                      const res = await deletePriorCertificate(certId);
                      if (res.error) return setError(res.error);
                      setPicked((prev) => {
                        const next = new Set(prev);
                        next.delete(r.studentId);
                        return next;
                      });
                      router.refresh();
                    });
                  }}
                  style={{ ...softButtonStyle, color: "var(--bad)", border: "1px solid var(--bad)" }}
                >
                  حذف
                </button>
              )}
            </label>
          ))
        )}
      </div>
      {adding && (
        <PriorDrawer
          kind={kind}
          students={students}
          taken={new Set(all.filter((c) => c.cert).map((c) => c.studentId))}
          onClose={() => setAdding(false)}
          onSaved={(studentId) => {
            setAdding(false);
            setPicked((prev) => new Set(prev).add(studentId));
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** «شهادة سابقة»: طالب مسجّل (بياناته تلقائيًا) + تاريخ الإصدار (+ العلامة لشهادة القراءة العربية) — برقم تلقائي */
function PriorDrawer({
  kind,
  students,
  taken,
  onClose,
  onSaved,
}: {
  kind: CertificateKindId;
  students: PriorStudent[];
  taken: Set<string>;
  onClose: () => void;
  onSaved: (studentId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [student, setStudent] = useState<PriorStudent | null>(null);
  const [mark, setMark] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const matches = useMemo(() => {
    const t = q.trim();
    if (!t) return [];
    return students.filter((s) => textHas(s.name, t) || String(s.no) === t).slice(0, 20);
  }, [students, q]);
  const label = { display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 } as const;
  const info = (k: string, v: string) => (
    <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
      <span style={{ color: "var(--ink-3)", minWidth: 90 }}>{k}</span>
      <span style={{ fontWeight: 600 }}>{v || "—"}</span>
    </div>
  );

  function save() {
    setError("");
    if (!student) return setError("اختاروا الطالب.");
    if (kind === "ARABIC" && mark === "") return setError("اكتبوا العلامة (من 100).");
    start(async () => {
      const res = await addPriorCertificate(kind, student.id, kind === "ARABIC" ? Number(mark) : null);
      if (res.error) return setError(res.error);
      onSaved(student.id);
    });
  }

  return (
    <Drawer
      open
      title="شهادة سابقة"
      subtitle={`${CERTIFICATE_LABELS[kind]} صدرت قبل الموقع — بيانات الطالب من سجله، والرقم تلقائي`}
      onClose={onClose}
      footer={
        <button type="button" disabled={pending} onClick={save} style={{ ...primaryButtonStyle, width: "100%", opacity: pending ? 0.7 : 1 }}>
          {pending ? "جارٍ الحفظ…" : "حفظ الشهادة"}
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!student ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={label}>الطالب</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اكتبوا اسم الطالب أو رقمه" style={inputStyle()} autoFocus />
            {q.trim() && matches.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد طالب بهذا الاسم أو الرقم.</div>}
            {matches.map((s) => {
              const has = taken.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={has}
                  onClick={() => setStudent(s)}
                  style={{ padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)", color: "var(--ink)", textAlign: "start", cursor: has ? "not-allowed" : "pointer", opacity: has ? 0.55 : 1, fontFamily: "inherit" }}
                >
                  <span style={{ fontWeight: 600 }}>{s.name}</span> <span style={{ fontSize: 12, color: "var(--ink-3)" }}>#{s.no}</span>
                  {has && <span style={{ fontSize: 12, color: "var(--ink-2)" }}> — له هذه الشهادة</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1 }}>تُكتب في الشهادة من سجل الطالب:</span>
              <button type="button" onClick={() => setStudent(null)} style={{ ...softButtonStyle, fontSize: 11.5 }}>
                تغيير الطالب
              </button>
            </div>
            {info("الاسم", kind === "AMMA" ? student.name : student.nasabName)}
            {kind === "ARABIC" && info("اسم الأب", student.father)}
            {kind === "ARABIC" && info("مكان الولادة", student.birthPlace)}
            {kind === "ARABIC" && info("سنة الولادة", student.birthYear)}
          </div>
        )}
        {kind === "ARABIC" && (
          <div>
            <label style={label}>العلامة (من 100)</label>
            <NumberField value={mark} onChange={(e) => setMark(e.target.value)} half style={{ width: 140 }} />
          </div>
        )}
        {error && <div style={{ padding: "10px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{error}</div>}
      </div>
    </Drawer>
  );
}
