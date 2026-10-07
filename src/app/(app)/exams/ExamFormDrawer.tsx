"use client";

import { useActionState, useEffect, useState } from "react";
import { saveExam, type FormState } from "./actions";
import { chipStyle, inputStyle, primaryButtonStyle } from "@/lib/ui";
import {
  JUZ,
  NOMINATION_PARTS,
  LOCAL_KINDS,
  LOCAL_KIND_LABELS,
  ARABIC_STAGES,
  ARABIC_GRADES,
  isArabicMarkStage,
  arabicStageLabel,
  ARABIC_PASS_MARK,
  ARABIC_FAIL_GRADE,
  TYPE_LABELS,
  passFailLabel,
  passThreshold,
  type ExamTypeId,
  type LocalKindId,
} from "@/lib/exam";
import { today } from "@/lib/daily";
import Drawer from "@/components/Drawer";
import DeleteExamButton from "./DeleteExamButton";
import DateField from "@/components/DateField";
import NumberField from "@/components/NumberField";

const initialState: FormState = {};

export type ExistingExam = {
  id: string;
  studentId: string;
  date: string;
  localKind: LocalKindId | null;
  juz: number | null;
  pages: number[];
  resultMark: number | null;
  nominationPresent: boolean | null;
  nominationParts: number | null;
  stage?: number | null;
  grade?: string | null;
  startPage?: number | null;
  repeat?: boolean;
  notes: string | null;
};

/**
 * نتيجة السبر: «ناجح» أو «إعادة» أولًا. «إعادة» بلا علامة، و«ناجح» بعلامة ضمن علامات النجاح (من حدّ النجاح إلى 100).
 */
function OutcomeMark({
  outcome,
  setOutcome,
  mark,
  setMark,
  passMark,
  hint,
}: {
  outcome: "" | "pass" | "repeat";
  setOutcome: (v: "pass" | "repeat") => void;
  mark: string;
  setMark: (v: string) => void;
  passMark: number | null;
  hint?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>نتيجة السبر</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setOutcome("pass")} style={{ ...chipStyle(outcome === "pass"), minHeight: 44, padding: "10px 24px" }}>
            ناجح
          </button>
          <button
            type="button"
            onClick={() => {
              setOutcome("repeat");
              setMark("");
            }}
            style={{ ...chipStyle(outcome === "repeat"), minHeight: 44, padding: "10px 24px" }}
          >
            إعادة
          </button>
        </div>
      </div>
      {outcome === "pass" && (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>العلامة</div>
          <NumberField
            value={mark}
            onChange={(e) => setMark(e.target.value)}
            placeholder={passMark != null ? `${passMark} — 100` : "— 100"}
            style={{ width: 120, minHeight: 46, padding: 11, fontSize: 17 }}
          />
          <div style={{ marginTop: 7, fontSize: 12, color: "var(--ink-3)" }}>
            {passMark != null ? `علامات النجاح من ${passMark} إلى 100.` : ""}
            {hint ? ` ${hint}` : ""}
          </div>
        </div>
      )}
      {outcome === "repeat" && <div style={{ fontSize: 12, color: "var(--ink-3)" }}>«إعادة» بلا علامة — يُعيد الطالب السبر لاحقًا.</div>}
    </div>
  );
}

export default function ExamFormDrawer({
  type,
  student,
  existing,
  onClose,
  onSaved,
}: {
  type: ExamTypeId;
  /** null فقط عند إضافة طالب جديد ضمن تحديد المستوى */
  student: { id: string; name: string; no?: number; halqaName?: string } | null;
  existing: ExistingExam | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveExam, initialState);

  const [name, setName] = useState("");
  const [date, setDate] = useState(existing?.date ?? today());
  const [localKind, setLocalKind] = useState<LocalKindId | "">(existing?.localKind ?? "");
  const [juz, setJuz] = useState<number | null>(existing?.juz ?? null);
  // تحديد المستوى بالقراءة العربية: صفحة البداية (5–48) بدل الجزء
  const [arabicPlacement, setArabicPlacement] = useState(existing?.startPage != null);
  const [startPage, setStartPage] = useState<number | null>(existing?.startPage ?? null);
  const [resultMark, setResultMark] = useState(existing?.resultMark != null ? String(existing.resultMark) : "");
  const [outcome, setOutcome] = useState<"" | "pass" | "repeat">(existing?.repeat ? "repeat" : existing?.resultMark != null ? "pass" : "");
  const [nominationPresent, setNominationPresent] = useState<boolean | null>(existing?.nominationPresent ?? null);
  const [nominationParts, setNominationParts] = useState<number | null>(existing?.nominationParts ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [stage, setStage] = useState<number | null>(existing?.stage ?? null);
  const [grade, setGrade] = useState(existing?.grade ?? "");
  useEffect(() => {
    if (state.ok) {
      onSaved?.();
      onClose();
    }
  }, [state.ok, onClose, onSaved]);

  const titles = TYPE_LABELS;
  const isArabic = type === "ARABIC";
  const markStage = isArabic && isArabicMarkStage(stage);

  const partsOptions = nominationPresent == null ? [] : NOMINATION_PARTS[nominationPresent ? "present" : "absent"];

  const currentPassFail =
    type === "PLACEMENT"
      ? null
      : passFailLabel({
          type,
          localKind: localKind || null,
          resultMark: resultMark ? parseInt(resultMark, 10) : null,
          nominationPresent,
          stage,
          grade: grade || null,
          repeat: outcome === "repeat",
        });

  return (
    <Drawer
      open
      onClose={onClose}
      title={existing ? `تعديل ${titles[type]}` : titles[type]}
      subtitle={student ? student.name : "طالب جديد — الاسم فقط"}
      footer={
        <>
          <button form="exam-form" type="submit" disabled={pending} style={{ ...primaryButtonStyle, flex: 1, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ السبر"}
          </button>
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 14, cursor: "pointer" }}>
            إلغاء
          </button>
          {/* يُفتح النموذج لمن يملك تعديل هذا السبر — المدير، أو المختبِر الذي أجراه */}
          {existing && <DeleteExamButton examId={existing.id} big onDeleted={onClose} />}
        </>
      }
    >
      {state.error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {state.error}
        </div>
      )}

      <form id="exam-form" action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <input type="hidden" name="id" value={existing?.id ?? ""} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="studentId" value={student?.id ?? ""} />
        <input type="hidden" name="localKind" value={localKind} />
        <input type="hidden" name="juz" value={juz ?? ""} />
        <input type="hidden" name="resultMark" value={resultMark} />
        <input type="hidden" name="outcome" value={outcome} />
        <input type="hidden" name="nominationPresent" value={nominationPresent == null || (type === "PLACEMENT" && arabicPlacement) ? "" : nominationPresent ? "1" : "0"} />
        <input type="hidden" name="startPage" value={type === "PLACEMENT" && arabicPlacement ? startPage ?? "" : ""} />
        <input type="hidden" name="nominationParts" value={nominationParts ?? ""} />
        <input type="hidden" name="stage" value={stage ?? ""} />
        <input type="hidden" name="grade" value={grade} />

        {isArabic && (
          <>
            {/* بطاقة الطالب: الاسم والرقم والحلقة، ثم التاريخ (اليوم تلقائيًا) */}
            <div style={{ padding: "12px 14px", borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700 }}>
                {student?.name}{" "}
                {student?.no != null && <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>#{student.no}</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>الحلقة: {student?.halqaName || "—"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
              <DateField label="تاريخ السبر" name="date" value={date} onChange={setDate} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>المرحلة</div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {ARABIC_STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    style={{ ...chipStyle(stage === s), minWidth: 48, minHeight: 44, padding: s === 7 ? "0 14px" : 0, fontSize: s === 7 ? 14 : 16 }}
                  >
                    {s === 7 ? arabicStageLabel(s) : s}
                  </button>
                ))}
              </div>
            </div>
            {stage != null && !markStage && (
              <div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>التقدير</div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {ARABIC_GRADES.map((g) => (
                    <button key={g} type="button" onClick={() => setGrade(g)} style={{ ...chipStyle(grade === g), minHeight: 44, padding: "10px 18px" }}>
                      {g}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 7, fontSize: 12, color: "var(--ink-3)" }}>«{ARABIC_FAIL_GRADE}» تعني أن يُعيد الطالب السبر؛ جيد وجيد جدًا وممتاز تعني ناجح.</div>
              </div>
            )}
            {markStage && (
              <OutcomeMark
                outcome={outcome}
                setOutcome={setOutcome}
                mark={resultMark}
                setMark={setResultMark}
                passMark={ARABIC_PASS_MARK}
                hint={
                  stage === 7
                    ? "والنجاح في «بينة للناس» ينقل الطالب إلى مستوى «عمَّ غيباً» ويُخرجه من حلقته لإعادة فرزه."
                    : stage === 6
                      ? "والنجاح فيها يحوّل تسميعه إلى «بينة للناس» ويبقى في حلقته."
                      : undefined
                }
              />
            )}
          </>
        )}

        {type === "PLACEMENT" && !student && (
          <div>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>اسم الطالب</label>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم فقط — بقية بياناته تُستكمل عند الفرز"
              style={inputStyle()}
            />
          </div>
        )}

        {type === "WAQF_NOMINATION" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>نوع السبر</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => { setNominationPresent(true); setNominationParts(null); }} style={{ ...chipStyle(nominationPresent === true), minHeight: 44, padding: "10px 22px" }}>
                  حاضرًا
                </button>
                <button type="button" onClick={() => { setNominationPresent(false); setNominationParts(null); }} style={{ ...chipStyle(nominationPresent === false), minHeight: 44, padding: "10px 22px" }}>
                  غيبًا
                </button>
              </div>
              <div style={{ marginTop: 7, fontSize: 12, color: "var(--ink-3)" }}>
                اختيار «حاضرًا» أو «غيبًا» يقفل الاختيار الآخر فورًا.
              </div>
            </div>
            {nominationPresent != null && (
              <div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>عدد الأجزاء</div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {partsOptions.map((n) => (
                    <button key={n} type="button" onClick={() => setNominationParts(n)} style={chipStyle(nominationParts === n)}>
                      {n} أجزاء
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {type === "PLACEMENT" && (
          <div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>نوع السبر</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setArabicPlacement(false);
                  setNominationPresent(true);
                }}
                style={{ ...chipStyle(!arabicPlacement && nominationPresent === true), minHeight: 44, padding: "10px 22px" }}
              >
                حاضرًا
              </button>
              <button
                type="button"
                onClick={() => {
                  setArabicPlacement(false);
                  setNominationPresent(false);
                }}
                style={{ ...chipStyle(!arabicPlacement && nominationPresent === false), minHeight: 44, padding: "10px 22px" }}
              >
                غيبًا
              </button>
              <button
                type="button"
                onClick={() => {
                  setArabicPlacement(true);
                  setNominationPresent(null);
                }}
                style={{ ...chipStyle(arabicPlacement), minHeight: 44, padding: "10px 22px" }}
              >
                قراءة عربية
              </button>
            </div>
          </div>
        )}

        {type === "PLACEMENT" && arabicPlacement && (
          <div style={{ padding: 14, borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>الصفحة التي يبدأ منها الطالب</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 10 }}>
              صفحة من كتاب «مختصر القراءة العربية» (5–48) — يُسجَّل الطالب على مستوى «قراءة عربية» ويُفرز على حلقة منه.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Array.from({ length: 44 }, (_, i) => i + 5).map((p) => (
                <button key={p} type="button" onClick={() => setStartPage(p)} style={{ ...chipStyle(startPage === p), width: 42, minHeight: 40, padding: 0 }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === "PLACEMENT" && !arabicPlacement && (
          <div style={{ padding: 14, borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>الجزء الذي يبدأ منه الطالب</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 10 }}>
              لا يُختبَر في جزء معيّن — نتيجة السبر هي فرزه على أحد الأجزاء الثلاثين ليبدأ حفظه منه.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {JUZ.map((j) => (
                <button key={j} type="button" onClick={() => setJuz(j)} style={{ ...chipStyle(juz === j), width: 42, minHeight: 40, padding: 0 }}>
                  {j}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === "LOCAL" && (
          <>
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>نوع السبر المحلي</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {LOCAL_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setLocalKind(k)}
                    style={{ ...chipStyle(localKind === k), minHeight: 44, padding: "10px 20px" }}
                  >
                    {LOCAL_KIND_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>

            {(localKind === "GHAYBAN" || localKind === "HADIRAN") && (
              <div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>الجزء الذي سُبر فيه الطالب</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {JUZ.map((j) => (
                    <button key={j} type="button" onClick={() => setJuz(j)} style={{ ...chipStyle(juz === j), width: 42, minHeight: 40, padding: 0 }}>
                      {j}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {localKind && (
              <OutcomeMark
                outcome={outcome}
                setOutcome={setOutcome}
                mark={resultMark}
                setMark={setResultMark}
                passMark={passThreshold("LOCAL", localKind, null)}
              />
            )}

          </>
        )}

        {type === "WAQF_NOMINATION" && nominationPresent != null && (
          <OutcomeMark
            outcome={outcome}
            setOutcome={setOutcome}
            mark={resultMark}
            setMark={setResultMark}
            passMark={passThreshold("WAQF_NOMINATION", null, nominationPresent)}
          />
        )}

        {currentPassFail && (
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              padding: "6px 16px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              border: `1px solid ${currentPassFail === "ناجح" ? "rgba(111,191,139,0.5)" : "rgba(224,138,138,0.5)"}`,
              background: currentPassFail === "ناجح" ? "rgba(111,191,139,0.12)" : "rgba(224,138,138,0.12)",
              color: currentPassFail === "ناجح" ? "var(--ok)" : "var(--bad)",
            }}
          >
            النتيجة: {currentPassFail}
          </div>
        )}

        {!isArabic && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
            <DateField label="تاريخ السبر" name="date" value={date} onChange={setDate} />
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>ملاحظات المختبِر</label>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="ما يحتاج المدرّس أن يعرفه"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 14, lineHeight: 1.6, resize: "vertical" }}
          />
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-3)" }}>
            {isArabic ? "تصل هذه الملاحظات والمرحلة والنتيجة تلقائيًا إلى مدرّس الطالب." : "تصل هذه الملاحظات والنتيجة تلقائيًا إلى مدرّس الطالب."}
          </div>
        </div>
      </form>
    </Drawer>
  );
}
