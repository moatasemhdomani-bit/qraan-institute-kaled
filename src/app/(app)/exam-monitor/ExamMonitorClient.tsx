"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cardStyle, chipStyle, inputStyle } from "@/lib/ui";
import { sunnahSlug, type SunnahSectionId } from "@/lib/sunnah";
import { resultLabel, passFailLabel, examKindLabel, isSunnahType, TYPE_LABELS, type ExamTypeId } from "@/lib/exam";
import { formatDateAr } from "@/lib/daily";
import { awqafPassed, certCycleLabel } from "@/lib/awqaf";
import ExamFormDrawer, { type ExistingExam } from "../exams/ExamFormDrawer";
import Select from "@/components/Select";
import { useCohortTeacherFilter } from "@/components/useCohortTeacherFilter";
import DeleteExamButton from "../exams/DeleteExamButton";

type RowType = ExamTypeId | "AWQAF_ACTUAL";

/** أنواع السبر التي يُجريها المدير من «متابعة السبر». */
const EXAM_SCREENS = [
  { href: "/exams/local", label: "سبر محلي" },
  { href: "/exams/awqaf", label: "ترشيح الأوقاف" },
  { href: "/exams/placement", label: "تحديد مستوى" },
  { href: "/exams/arabic", label: "سبر القراءة العربية" },
  { href: "/exams/sunnah", label: "سبر السنة النبوية" },
  { href: "/exams/sunnah/nomination", label: "ترشيح الأوقاف للسنة النبوية" },
];

const examBtnStyle = {
  padding: "6px 13px",
  borderRadius: 9,
  fontSize: 12.5,
  fontWeight: 600,
  border: "1px solid var(--btn-border)",
  background: "var(--btn-grad)",
  color: "var(--on-accent)",
  whiteSpace: "nowrap" as const,
};
type Row = ExistingExam & {
  type: RowType;
  studentName: string;
  examinerId: string;
  examinerName: string;
  batchId: string | null;
  certArrived: boolean;
  certArchived: boolean;
  certDelivered: boolean;
};
type Block = {
  id: string;
  name: string;
  meta: string;
  teacherName: string;
  cohortName: string;
  rows: Row[];
  neverLabel: string;
};

export default function ExamMonitorClient({
  canEdit,
  isDirector,
  canManageAwqaf,
  canDelete,
  typeFilters,
  currentUserId,
  blocks,
}: {
  canEdit: boolean;
  isDirector: boolean;
  canManageAwqaf: boolean;
  /** الإدارة (المدير والإداري): حذف أي سبر من أي نوع، ومنه سبر الأوقاف الفعلي */
  canDelete: boolean;
  /** أنواع السبر الظاهرة في الفلترة — للمدرّس أنواع طلابه فقط */
  typeFilters: Exclude<RowType, "PLACEMENT">[];
  currentUserId: string;
  blocks: Block[];
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | RowType>("all");
  const [examinerFilter, setExaminerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [examMenu, setExamMenu] = useState(false);
  const [editing, setEditing] = useState<{ row: Row & { type: ExamTypeId }; halqaName: string } | null>(null);

  const examinerNames = useMemo(() => {
    const names = new Set<string>();
    blocks.forEach((b) => b.rows.forEach((r) => names.add(r.examinerName)));
    return Array.from(names);
  }, [blocks]);

  const q = search.trim();
  const byType = (x: Row) => typeFilter === "all" || x.type === typeFilter;
  const byExaminer = (x: Row) => examinerFilter === "all" || x.examinerName === examinerFilter;
  const bySearch = (x: Row) => !q || x.studentName.includes(q);
  const { shown: cohortTeacherBlocks, selects } = useCohortTeacherFilter(blocks, (b) => b.rows.filter((x) => byType(x) && byExaminer(x) && bySearch(x)).length);
  // عدد السبورات لكل خيار (ضمن بقية الفلاتر)
  const ctRows = cohortTeacherBlocks.flatMap((b) => b.rows).filter(bySearch);
  const typeCount = (t: string) => ctRows.filter((x) => byExaminer(x) && (t === "all" || x.type === t)).length;
  const examinerCount = (n: string) => ctRows.filter((x) => byType(x) && (n === "all" || x.examinerName === n)).length;
  const filteredBlocks = cohortTeacherBlocks
    .map((b) => ({
      ...b,
      rows: b.rows.filter(
        (r) =>
          (typeFilter === "all" || r.type === typeFilter) &&
          (examinerFilter === "all" || r.examinerName === examinerFilter) &&
          (!q || r.studentName.includes(q))
      ),
    }))
    // عند البحث باسم طالب تُخفى الحلقات التي لا نتيجة فيها
    .filter((b) => !q || b.rows.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {isDirector && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {/* المدير يُجري السبر من هنا كما يسجّل التسميع من متابعة التسميع: زر واحد ثم يختار نوع السبر */}
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => setExamMenu((v) => !v)} style={{ ...examBtnStyle, cursor: "pointer", padding: "9px 18px", fontSize: 13.5 }}>
              إجراء سبر ▾
            </button>
            {examMenu && (
              <div
                style={{
                  position: "absolute",
                  insetInlineEnd: 0,
                  top: "calc(100% + 6px)",
                  zIndex: 20,
                  minWidth: 200,
                  padding: 6,
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  background: "var(--panel-solid)",
                  boxShadow: "var(--glow)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {EXAM_SCREENS.map((x) => (
                  <Link
                    key={x.href}
                    href={x.href}
                    style={{ padding: "10px 12px", borderRadius: 8, color: "var(--ink)", fontSize: 13.5, display: "block" }}
                  >
                    {x.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن طالب باسمه"
          style={inputStyle()}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          <Select
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as typeof typeFilter)}
            options={(["all", ...typeFilters] as const).map((t) => ({
              value: t,
              label: `${t === "all" ? "كل الأنواع" : t === "AWQAF_ACTUAL" ? "سبر الأوقاف الفعلي" : TYPE_LABELS[t]} (${typeCount(t)})`,
            }))}
          />
          <Select value={examinerFilter} onChange={setExaminerFilter} options={[{ value: "all", label: `كل المختبِرين (${examinerCount("all")})` }, ...examinerNames.map((n) => ({ value: n, label: `${n} (${examinerCount(n)})` }))]} />
          {selects}
        </div>
      </div>


      <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>عدد النتائج: {filteredBlocks.reduce((n, b) => n + b.rows.length, 0)} سبرًا في {filteredBlocks.length} حلقة</div>

      {filteredBlocks.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>
          {q ? `لا سبر مسجّل لطالب باسم «${q}».` : "لا توجد حلقات بعد."}
        </div>
      )}

      {filteredBlocks.map((b) => (
        <div key={b.id} style={{ ...cardStyle, overflow: "hidden", border: b.neverLabel ? "1px solid rgba(224,138,138,0.5)" : undefined }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line-2)" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{b.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{b.meta}</div>
            {b.neverLabel && <div style={{ fontSize: 12, color: "var(--bad-ink)", marginTop: 6 }}>{b.neverLabel}</div>}
          </div>
          {b.rows.length === 0 ? (
            <div style={{ padding: "16px", fontSize: 13, color: "var(--ink-3)" }}>لا نتائج مطابقة للفلاتر الحالية.</div>
          ) : (
            b.rows.map((r) => {
              const isAwqafActual = r.type === "AWQAF_ACTUAL";
              const examRow = r as Row & { type: ExamTypeId };
              const passFail = isAwqafActual
                ? awqafPassed(r.resultMark, r.nominationPresent ?? false) === null
                  ? null
                  : awqafPassed(r.resultMark, r.nominationPresent ?? false)
                    ? "ناجح"
                    : "إعادة"
                : passFailLabel(examRow);
              const resultText = isAwqafActual
                ? r.resultMark != null ? `${r.resultMark} / 100` : "بانتظار العلامة"
                : resultLabel(examRow);
              return (
              <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "11px 16px", borderTop: "1px solid var(--line-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{r.studentName}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, border: "1px solid var(--line)", color: "var(--ink-2)" }}>
                    {isAwqafActual ? "سبر الأوقاف الفعلي" : TYPE_LABELS[r.type as ExamTypeId]}
                  </span>
                  {examKindLabel(r) && (
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1px solid var(--accent-line)", color: "var(--ink)" }}>
                      {examKindLabel(r)}
                    </span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{resultText}</span>
                  {passFail && resultText !== passFail && (
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        border: `1px solid ${passFail === "ناجح" ? "rgba(111,191,139,0.5)" : "rgba(224,138,138,0.5)"}`,
                        color: passFail === "ناجح" ? "var(--ok)" : "var(--bad)",
                      }}
                    >
                      {passFail}
                    </span>
                  )}
                  {isAwqafActual && passFail === "ناجح" && (
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{certCycleLabel(r)}</span>
                  )}
                  {isSunnahType(r.type) && canEdit && (
                    <Link
                      href={r.type === "SUNNAH_AWQAF" ? "/exams/awqaf-batches" : `/exams/sunnah/${sunnahSlug((r.sunnahSection ?? "HADITH") as SunnahSectionId)}`}
                      style={{ marginInlineStart: "auto", padding: "6px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, textDecoration: "none" }}
                    >
                      {r.type === "SUNNAH_AWQAF" ? "فتح سبر الأوقاف" : "فتح شاشة المنهج"}
                    </Link>
                  )}
                  {!isAwqafActual && !isSunnahType(r.type) && canEdit && (isDirector || r.examinerId === currentUserId) && (
                    <button
                      onClick={() => setEditing({ row: r as Row & { type: ExamTypeId }, halqaName: b.name })}
                      style={{ marginInlineStart: "auto", padding: "6px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
                    >
                      تعديل
                    </button>
                  )}
                  {isAwqafActual && canManageAwqaf && r.batchId && (
                    <Link
                      href={`/exams/awqaf-batches/${r.batchId}`}
                      style={{ marginInlineStart: "auto", padding: "6px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, textDecoration: "none" }}
                    >
                      فتح الدفعة
                    </Link>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--ink-2)" }}>
                  {!isAwqafActual && <span>المختبِر: {r.examinerName}</span>}
                  <span>{formatDateAr(r.date)}</span>
                  {canDelete && (
                    <span style={{ marginInlineStart: "auto" }}>
                      {isAwqafActual ? <DeleteExamButton awqafResultId={r.id} /> : <DeleteExamButton examId={r.id} />}
                    </span>
                  )}
                </div>
                {r.notes && <div style={{ fontSize: 12.5, color: "var(--ink-2)", whiteSpace: "pre-line" }}>ملاحظات: {r.notes}</div>}
              </div>
              );
            })
          )}
        </div>
      ))}

      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
        {canEdit
          ? "بصفتكم مدير المعهد يمكنكم إضافة سبر أو تعديل أي سبر أجراه أي مختبِر — بنفس شاشة السبر التي يستعملها هو."
          : "عرض فقط — كما في متابعة الحضور والتسميع."}
      </div>

      {editing && (
        <ExamFormDrawer
          type={editing.row.type}
          student={{ id: editing.row.studentId, name: editing.row.studentName, halqaName: editing.halqaName }}
          existing={editing.row}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
