"use client";

import { useMemo, useState } from "react";
import { cardStyle, chipStyle, primaryButtonStyle, inputStyle } from "@/lib/ui";
import { formatTime12, formatDateAr } from "@/lib/daily";
import PermitForm, { type ExistingPermit, type ExistingAbsence } from "./PermitForm";
import type { CohortTimes } from "@/lib/cohortTime";
import { deleteStudentPermits, deleteAbsencePermit } from "./actions";
import { textHas } from "@/lib/search";
import Select from "@/components/Select";

const KIND_LABELS: Record<string, string> = { ENTRY: "إذن دخول", EXIT: "إذن خروج" };
const KIND_COLORS: Record<string, string> = { ENTRY: "var(--ok)", EXIT: "var(--gold)" };
const KIND_VERBS: Record<string, string> = { ENTRY: "يدخل في", EXIT: "يخرج في" };

type Permit = {
  id: string;
  studentId: string;
  kind: "ENTRY" | "EXIT";
  time: string;
  note: string | null;
  since: string;
  /** أيام الإذن — فارغة في الأذونات القديمة = كل أيام الدوام */
  days: string[];
  setByName: string;
};
/** إذن غياب: «يوم» (from = to) أو «فترة» */
type Absence = { id: string; studentId: string; from: string; to: string; note: string | null; setByName: string };
type Halqa = {
  id: string;
  name: string;
  teacherName: string;
  cohortName: string;
  cohortTimes: CohortTimes;
  students: { id: string; no: number; name: string }[];
  permits: Permit[];
  absences: Absence[];
};
type PType = "all" | "time" | "day" | "range";
type PStatus = "all" | "current" | "upcoming" | "ended";
const PTYPE_OPTIONS = [
  { value: "all", label: "كل أنواع الإذن" },
  { value: "time", label: "إذن وقت" },
  { value: "day", label: "إذن يوم" },
  { value: "range", label: "إذن فترة" },
];
const PSTATUS_OPTIONS = [
  { value: "all", label: "كل الحالات" },
  { value: "current", label: "ساري اليوم" },
  { value: "upcoming", label: "قادم" },
  { value: "ended", label: "منتهٍ" },
];

export default function PermitsClient({
  scopeNote,
  halaqat: allHalaqat,
  workDays,
  readOnly = false,
  today,
}: {
  scopeNote: string;
  halaqat: Halqa[];
  workDays: string[];
  readOnly?: boolean;
  today: string;
}) {
  const [ptype, setPtype] = useState<PType>("all");
  const [pstatus, setPstatus] = useState<PStatus>("all");
  const [cohort, setCohort] = useState("all");
  const [teacher, setTeacher] = useState("all");
  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "ar"));
  const cohortOptions = [{ value: "all", label: "كل الأفواج" }, ...uniq(allHalaqat.map((h) => h.cohortName)).map((n) => ({ value: n, label: `فوج ${n}` }))];
  const teacherOptions = [
    { value: "all", label: "كل المدرّسين" },
    ...uniq(allHalaqat.filter((h) => cohort === "all" || h.cohortName === cohort).map((h) => h.teacherName)).map((n) => ({ value: n, label: n })),
  ];
  const halaqat = allHalaqat.filter((h) => (cohort === "all" || h.cohortName === cohort) && (teacher === "all" || h.teacherName === teacher));
  // إذن الوقت دائم: ساري اليوم دائمًا
  const showTime = (ptype === "all" || ptype === "time") && (pstatus === "all" || pstatus === "current");
  const absenceOk = (a: Absence) =>
    (ptype === "all" || (ptype === "day" ? a.from === a.to : ptype === "range" ? a.from !== a.to : false)) &&
    (pstatus === "all" ||
      (pstatus === "current" ? a.from <= today && a.to >= today : pstatus === "upcoming" ? a.from > today : a.to < today));
  const [kindFilter, setKindFilterRaw] = useState<"all" | "ENTRY" | "EXIT">("all");
  const setKindFilter = setKindFilterRaw;
  // «اختر وقتًا»: الطلاب الذين لهم إذن بهذا الوقت (من نوع الإذن المختار)
  const [timeFilter, setTimeFilter] = useState("all");
  const kindOk = (p: Permit) => ptype !== "time" || kindFilter === "all" || p.kind === kindFilter;
  const timeOptions = [
    { value: "all", label: "اختر وقتًا" },
    ...[...new Set(halaqat.flatMap((h) => h.permits.filter(kindOk).map((p) => p.time)))].sort().map((x) => ({ value: x, label: formatTime12(x) })),
  ];
  const activeTime = timeOptions.some((o) => o.value === timeFilter) ? timeFilter : "all";

  // initialStudentId: فُتح النموذج من نتيجة البحث «لا يوجد إذن» على طالب بعينه
  const [formOpen, setFormOpen] = useState<{ existing: ExistingPermit | null; absence?: ExistingAbsence; initialStudentId?: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleRowDelete(studentId: string) {
    setDeletingId(studentId);
    const res = await deleteStudentPermits(studentId);
    setDeletingId(null);
    if (res.error) setNotice(res.error);
    else setNotice("حُذف الإذن — عاد الطالب إلى دوام الفوج المعتاد.");
  }

  const studentNameOf = (halqa: Halqa, studentId: string) => halqa.students.find((s) => s.id === studentId)?.name ?? "";

  const blocks = useMemo(
    () =>
      halaqat.map((h) => {
        // صف واحد لكل طالب يجمع إذنيه (الدخول ثم الخروج) معًا
        const byStudent = new Map<string, Permit[]>();
        for (const p of h.permits) byStudent.set(p.studentId, [...(byStudent.get(p.studentId) ?? []), p]);
        const rows = [...byStudent.entries()]
          .filter(([, ps]) => ps.some((p) => kindOk(p) && (activeTime === "all" || p.time === activeTime)))
          .map(([studentId, ps]) => {
            const sorted = [...ps].sort((a, b) => (a.kind === "ENTRY" ? -1 : 1) - (b.kind === "ENTRY" ? -1 : 1));
            const first = sorted[0];
            return {
              studentId,
              name: studentNameOf(h, studentId),
              permits: sorted,
              entry: sorted.find((p) => p.kind === "ENTRY") ?? null,
              exit: sorted.find((p) => p.kind === "EXIT") ?? null,
              // الأيام والسبب مشتركة بين الإذنين
              note: first.note,
              days: first.days,
              since: sorted.map((p) => p.since).sort()[0],
              setByName: first.setByName,
            };
          });
        return {
          id: h.id,
          name: h.name,
          meta: `${h.teacherName} · ${h.cohortName}`,
          rows,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [halaqat, kindFilter, activeTime, ptype]
  );

  const absenceRows = halaqat.flatMap((h) =>
    h.absences.filter(absenceOk).map((a) => ({ ...a, name: studentNameOf(h, a.studentId), halqaName: h.name, meta: `${h.teacherName} · ${h.cohortName}` }))
  );
  const [absDeleting, setAbsDeleting] = useState<string | null>(null);
  async function deleteAbsence(id: string) {
    setAbsDeleting(id);
    const res = await deleteAbsencePermit(id);
    setAbsDeleting(null);
    setNotice(res.error ?? "حُذف إذن الغياب.");
  }
  const absenceState = (a: Absence) => (a.from <= today && a.to >= today ? "ساري اليوم" : a.from > today ? "قادم" : "منتهٍ");

  const totalPermits = (showTime ? halaqat.reduce((sum, h) => sum + h.permits.length, 0) : 0) + absenceRows.length;
  const timeCount = showTime ? blocks.reduce((n, b) => n + b.rows.length, 0) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!readOnly && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => setFormOpen({ existing: null })} style={primaryButtonStyle}>
            إضافة إذن
          </button>
        </div>
      )}

      {notice && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(111,191,139,0.5)", background: "linear-gradient(135deg, rgba(111,191,139,0.16), rgba(111,191,139,0.03))", fontSize: 13.5 }}>
          <span style={{ flex: 1 }}>{notice}</span>
          <button onClick={() => setNotice("")} style={{ border: 0, background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontSize: 16 }}>
            ×
          </button>
        </div>
      )}

      <StudentPermitSearch
        halaqat={allHalaqat}
        onAdd={readOnly ? undefined : (id) => setFormOpen({ existing: null, initialStudentId: id })}
        onEdit={readOnly ? undefined : (existing) => setFormOpen({ existing })}
        onDelete={readOnly ? undefined : handleRowDelete}
        deletingId={deletingId}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: "12px 14px", borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          <Select value={ptype} onChange={(v) => setPtype(v as PType)} options={PTYPE_OPTIONS} />
          <Select value={pstatus} onChange={(v) => setPstatus(v as PStatus)} options={PSTATUS_OPTIONS} />
          <Select
            value={cohort}
            onChange={(v) => {
              setCohort(v);
              setTeacher("all");
            }}
            options={cohortOptions}
          />
          <Select value={teacher} onChange={setTeacher} options={teacherOptions} />
        </div>
        {/* الدخول والخروج ووقتهما: لإذن الوقت وحده */}
        {ptype === "time" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {(["all", "ENTRY", "EXIT"] as const).map((k) => (
              <button key={k} onClick={() => setKindFilter(k)} style={chipStyle(kindFilter === k)}>
                {k === "all" ? "النوعان" : KIND_LABELS[k]}
              </button>
            ))}
            <div style={{ marginInlineStart: "auto" }}>
              <Select value={activeTime} onChange={setTimeFilter} options={timeOptions} width={170} />
            </div>
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{scopeNote}</div>
      </div>

      {totalPermits > 0 && (
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
          عدد النتائج: {timeCount + absenceRows.length}
          {showTime && absenceRows.length > 0 ? ` — إذن وقت ${timeCount}، إذن يوم/فترة ${absenceRows.length}` : ""}
        </div>
      )}
      {absenceRows.length > 0 && (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line-2)", fontSize: 16, fontWeight: 700 }}>إذن يوم / فترة (غياب بإذن)</div>
          {absenceRows.map((a) => (
            <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "13px 16px", borderTop: "1px solid var(--line-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14.5, fontWeight: 600 }}>{a.name}</span>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  {a.halqaName} · {a.meta}
                </span>
                <span style={{ marginInlineStart: "auto", padding: "3px 10px", borderRadius: 999, fontSize: 11.5, border: "1px solid var(--line)", color: absenceState(a) === "ساري اليوم" ? "var(--ok)" : absenceState(a) === "قادم" ? "var(--gold)" : "var(--ink-3)" }}>
                  {absenceState(a)}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {a.from === a.to ? `إذن يوم: ${formatDateAr(a.from)}` : `إذن فترة: من ${formatDateAr(a.from)} إلى ${formatDateAr(a.to)}`}
              </div>
              {a.note && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>السبب: {a.note}</div>}
              <div style={{ fontSize: 12, color: "var(--ink-2)" }}>أضافه {a.setByName} — حضوره فيها «إذن» عند المدرّس</div>
              {!readOnly && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setFormOpen({ existing: null, absence: { id: a.id, studentId: a.studentId, studentName: a.name, from: a.from, to: a.to, note: a.note } })}
                    style={{ minHeight: 40, padding: "9px 15px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12.5, cursor: "pointer" }}
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => deleteAbsence(a.id)}
                    disabled={absDeleting === a.id}
                    style={{ minHeight: 40, padding: "9px 15px", borderRadius: 9, border: "1px solid rgba(224,138,138,0.45)", background: "linear-gradient(135deg, rgba(224,138,138,0.16), rgba(224,138,138,0.03))", color: "var(--bad-ink)", fontSize: 12.5, cursor: "pointer", opacity: absDeleting === a.id ? 0.6 : 1 }}
                  >
                    {absDeleting === a.id ? "جارٍ الحذف…" : "حذف الإذن"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {totalPermits === 0 ? (
        <div style={{ padding: "44px 22px", borderRadius: 16, border: "1px dashed var(--line)", background: "var(--card-grad)", textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>لا أذونات مطابقة</div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", maxWidth: 430, margin: "0 auto" }}>
            الطالب الذي يحتاج دخولًا متأخرًا أو خروجًا مبكرًا بشكل دائم يُضاف هنا مرة واحدة.
          </div>
        </div>
      ) : (
        blocks.map((b) =>
          !showTime || b.rows.length === 0 ? null : (
            <div key={b.id} style={{ ...cardStyle, overflow: "hidden" }}>
              <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line-2)" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{b.meta}</div>
              </div>
              {b.rows.map((p) => (
                <div key={p.studentId} style={{ display: "flex", flexDirection: "column", gap: 7, padding: "13px 16px", borderTop: "1px solid var(--line-2)" }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name}</div>
                  {p.permits.map((x) => (
                    <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <span style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12, border: `1px solid ${KIND_COLORS[x.kind]}`, color: KIND_COLORS[x.kind] }}>
                        {KIND_LABELS[x.kind]}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>
                        {KIND_VERBS[x.kind]} {formatTime12(x.time)}
                      </span>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                    أضافه {p.setByName} · قائم منذ {formatDateAr(p.since)}
                  </div>
                  {p.note && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>السبب: {p.note}</div>}
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>الأيام: {p.days.length ? p.days.join("، ") : "كل أيام الدوام"}</div>
                  {!readOnly && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() =>
                        setFormOpen({
                          existing: {
                            studentId: p.studentId,
                            studentName: p.name,
                            since: p.since,
                            entryTime: p.entry?.time ?? null,
                            exitTime: p.exit?.time ?? null,
                            note: p.note,
                            days: p.days,
                          },
                        })
                      }
                      style={{ minHeight: 40, padding: "9px 15px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12.5, cursor: "pointer" }}
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleRowDelete(p.studentId)}
                      disabled={deletingId === p.studentId}
                      style={{ minHeight: 40, padding: "9px 15px", borderRadius: 9, border: "1px solid rgba(224,138,138,0.45)", background: "linear-gradient(135deg, rgba(224,138,138,0.16), rgba(224,138,138,0.03))", color: "var(--bad-ink)", fontSize: 12.5, cursor: "pointer", opacity: deletingId === p.studentId ? 0.6 : 1 }}
                    >
                      {deletingId === p.studentId ? "جارٍ الحذف…" : p.permits.length > 1 ? "حذف الإذنين" : "حذف الإذن"}
                    </button>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )
        )
      )}

      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
        الإذن ليس ليوم واحد فقط، بل يلازم الطالب من تاريخ إضافته ويُطبَّق في أيامه المختارة حتى يُحذف من هذه الشاشة.
      </div>

      {formOpen && (
        <PermitForm
          halaqat={allHalaqat}
          workDays={workDays}
          existing={formOpen.existing}
          existingAbsence={formOpen.absence ?? null}
          initialStudentId={formOpen.initialStudentId}
          onClose={() => setFormOpen(null)}
          onSaved={(wasNew) =>
            setNotice(
              wasNew
                ? "حُفظ الإذن."
                : ""
            )
          }
          onDeleted={() => setNotice("حُذف الإذن — عاد الطالب إلى دوام الفوج المعتاد.")}
        />
      )}
    </div>
  );
}

/** بحث عن طالب بالاسم أو الرقم — يُظهر فورًا إن كان لديه إذن دخول/خروج أم لا. */
function StudentPermitSearch({
  halaqat,
  onAdd,
  onEdit,
  onDelete,
  deletingId,
}: {
  halaqat: Halqa[];
  onAdd?: (studentId: string) => void;
  /** لديه إذن: تعديله أو حذفه من هنا مباشرة (كما في السجل أسفل الشاشة) */
  onEdit?: (existing: ExistingPermit) => void;
  onDelete?: (studentId: string) => void;
  deletingId?: string | null;
}) {
  const [q, setQ] = useState("");
  const query = q.trim();

  const hits = useMemo(() => {
    if (!query) return [];
    const out: { id: string; no: number; name: string; halqaName: string; permits: Permit[] }[] = [];
    for (const h of halaqat) {
      for (const s of h.students) {
        if (textHas(s.name, query) || String(s.no) === query) {
          out.push({ ...s, halqaName: h.name, permits: h.permits.filter((p) => p.studentId === s.id) });
        }
      }
    }
    return out.slice(0, 15);
  }, [halaqat, query]);

  return (
    <div style={{ ...cardStyle, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عن طالب بالاسم أو الرقم — هل لديه إذن؟" style={inputStyle()} />
      {query && hits.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا طالب بهذا الاسم أو الرقم.</div>}
      {hits.map((s) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid var(--line-2)" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>{s.name}</span>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>#{s.no} · {s.halqaName}</span>
          {s.permits.length === 0 ? (
            <span style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12, border: "1px solid var(--line)", color: "var(--ink-2)" }}>لا يوجد إذن</span>
              {onAdd && (
                <button type="button" onClick={() => onAdd(s.id)} style={{ ...primaryButtonStyle, padding: "6px 13px", fontSize: 12.5 }}>
                  إضافة إذن لهذا الطالب
                </button>
              )}
            </span>
          ) : (
            <span style={{ marginInlineStart: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {s.permits.map((p) => (
                <span key={p.id} style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12, border: `1px solid ${KIND_COLORS[p.kind]}`, color: KIND_COLORS[p.kind] }}>
                  {KIND_LABELS[p.kind]} — {KIND_VERBS[p.kind]} {formatTime12(p.time)}
                </span>
              ))}
              {onEdit && (
                <button
                  type="button"
                  onClick={() =>
                    onEdit({
                      studentId: s.id,
                      studentName: s.name,
                      since: s.permits.map((x) => x.since).sort()[0],
                      entryTime: s.permits.find((x) => x.kind === "ENTRY")?.time ?? null,
                      exitTime: s.permits.find((x) => x.kind === "EXIT")?.time ?? null,
                      note: s.permits.find((x) => x.note)?.note ?? null,
                      days: s.permits[0]?.days ?? [],
                    })
                  }
                  style={{ padding: "5px 12px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
                >
                  تعديل
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(s.id)}
                  disabled={deletingId === s.id}
                  style={{ padding: "5px 12px", borderRadius: 9, border: "1px solid rgba(224,138,138,0.45)", background: "transparent", color: "var(--bad-ink)", fontSize: 12, cursor: "pointer", opacity: deletingId === s.id ? 0.6 : 1 }}
                >
                  {deletingId === s.id ? "جارٍ الحذف…" : s.permits.length > 1 ? "حذف الإذنين" : "حذف الإذن"}
                </button>
              )}
            </span>
          )}
          {/* تفاصيل الإذن كما في السجل أسفل الشاشة */}
          {s.permits.length > 0 && (
            <div style={{ width: "100%", fontSize: 12, color: "var(--ink-2)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span>
                أضافه {s.permits[0].setByName} · قائم منذ {formatDateAr(s.permits.map((x) => x.since).sort()[0])} · الأيام: {s.permits[0].days.length ? s.permits[0].days.join("، ") : "كل أيام الدوام"}
              </span>
              {s.permits.find((x) => x.note) && <span>السبب: {s.permits.find((x) => x.note)?.note}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
