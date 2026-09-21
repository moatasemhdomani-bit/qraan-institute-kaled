"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveStudent, resetGuardianPassword, type FormState } from "./actions";
import { saveBehavior, type BehaviorState } from "./behaviorActions";
import Link from "next/link";
import { copyToClipboard } from "@/lib/clipboard";
import { inputStyle, primaryButtonStyle, cardStyle, chipStyle } from "@/lib/ui";
import Drawer from "@/components/Drawer";
import PhotoField from "@/components/PhotoField";
import DateField from "@/components/DateField";
import Select from "@/components/Select";
import { today, formatDateAr } from "@/lib/daily";

type StudentRow = {
  id: string;
  no: string;
  name: string;
  father: string;
  mother: string;
  familyName: string;
  birth: string;
  address: string;
  job: string;
  phone: string;
  guardianPhone: string;
  photoUrl: string | null;
  registeredAt: string;
  halqaId: string;
  halqaName: string;
  cohortName: string;
  teacherName: string;
  guardianUsername: string;
  guardianPassword: string;
  behavior: string;
  behaviorLog: { previousValue: string; newValue: string; note: string; by: string; date: string }[];
};

const BEHAVIOR = ["ممتاز", "جيد جدًا", "جيد", "ضعيف"] as const;
const BEHAVIOR_COLORS: Record<string, string> = {
  "ممتاز": "#6FBF8B",
  "جيد جدًا": "#D4AF37",
  "جيد": "#8FA8C8",
  "ضعيف": "#E08A8A",
};

const initialState: FormState = {};

type HalqaOption = { id: string; name: string; cohortId: string; cohortName: string; teacherId: string; teacherName: string };

export default function StudentsClient({
  students,
  halaqat,
}: {
  students: StudentRow[];
  halaqat: HalqaOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [onlyUnsorted, setOnlyUnsorted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);

  const unsortedCount = useMemo(() => students.filter((s) => !s.halqaId).length, [students]);

  const filtered = useMemo(
    () =>
      students
        .filter((s) => !onlyUnsorted || !s.halqaId)
        .filter((s) => !search.trim() || s.name.includes(search.trim()) || s.no.includes(search.trim())),
    [students, search, onlyUnsorted]
  );

  function openNew() {
    setEditing(null);
    setDrawerOpen(true);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {halaqat.length > 0 && (
          <button onClick={openNew} style={primaryButtonStyle}>
            طالب جديد
          </button>
        )}
      </div>

      <div style={{ ...cardStyle, overflow: "auto" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line-2)", display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الطالب"
            style={inputStyle()}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => setOnlyUnsorted(false)} style={chipStyle(!onlyUnsorted)}>
              كل الطلاب
            </button>
            <button onClick={() => setOnlyUnsorted(true)} style={chipStyle(onlyUnsorted)}>
              غير مفروزين ({unsortedCount})
            </button>
          </div>
          {onlyUnsorted && (
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
              هؤلاء أضافهم المختبِر عبر تحديد المستوى ولم يُفرزوا على حلقة وفوج بعد — الفرز هو ما يُنشئ حساب ولي
              الأمر ويُلحق نتيجة السبر بملف الطالب.
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>لا يوجد طلاب مسجّلون</div>
            <div style={{ color: "var(--ink-2)", fontSize: 13, marginBottom: 16 }}>
              الفرز يتم على حلقة وفوج جاهزين — تأكد من إنشائهما أولًا.
            </div>
            <button onClick={() => (halaqat.length === 0 ? router.push("/halaqat") : openNew())} style={primaryButtonStyle}>
              {halaqat.length === 0 ? "إنشاء حلقة" : "طالب جديد"}
            </button>
          </div>
        ) : (
          <>
          <div className="list-table-wrap">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "0.5fr 1.1fr 0.9fr 0.8fr 1.1fr 90px",
                gap: 12,
                padding: "11px 16px",
                background: "var(--head-grad)",
                fontSize: 12,
                color: "var(--ink-2)",
                fontWeight: 600,
                minWidth: 720,
              }}
            >
              <div>رقم الطالب</div>
              <div>الاسم</div>
              <div>الحلقة</div>
              <div>الفوج</div>
              <div>المدرس</div>
              <div />
            </div>
            {filtered.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "0.5fr 1.1fr 0.9fr 0.8fr 1.1fr 90px",
                  gap: 12,
                  padding: "13px 16px",
                  borderTop: "1px solid var(--line-2)",
                  alignItems: "center",
                  fontSize: 14,
                  minWidth: 720,
                  background: s.halqaId ? undefined : "linear-gradient(90deg, rgba(224,138,138,0.10), transparent 60%)",
                }}
              >
                <div style={{ color: "var(--ink-3)", fontSize: 13, direction: "ltr", textAlign: "right" }}>{s.no}</div>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ color: s.halqaId ? "var(--ink-2)" : "#E8A0A0", fontSize: 13 }}>{s.halqaId ? s.halqaName : "غير مفروز"}</div>
                <div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--chip)", border: "1px solid var(--line)", fontSize: 12 }}>
                    {s.cohortName}
                  </span>
                </div>
                <div style={{ color: "var(--ink-2)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.teacherName}</div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setEditing(s);
                      setDrawerOpen(true);
                    }}
                    style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
                  >
                    تعديل
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="list-cards">
            {filtered.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: "13px 14px",
                  borderTop: "1px solid var(--line-2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: s.halqaId ? undefined : "linear-gradient(90deg, rgba(224,138,138,0.10), transparent 60%)",
                }}
              >
                <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: 12, color: "var(--ink-3)", direction: "ltr" }}>#{s.no}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: s.halqaId ? "var(--ink-2)" : "#E8A0A0" }}>{s.halqaId ? s.halqaName : "غير مفروز"}</span>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--chip)", border: "1px solid var(--line)", fontSize: 12 }}>
                      {s.cohortName}
                    </span>
                    {s.halqaId && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.teacherName}</span>}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditing(s);
                    setDrawerOpen(true);
                  }}
                  style={{ flex: "none", padding: "8px 14px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
                >
                  تعديل
                </button>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {drawerOpen && (
        <StudentForm key={editing?.id ?? "new"} initial={editing} halaqat={halaqat} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}

function StudentForm({
  initial,
  halaqat,
  onClose,
}: {
  initial: StudentRow | null;
  halaqat: HalqaOption[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveStudent, initialState);

  const initialHalqa = halaqat.find((h) => h.id === initial?.halqaId);
  const [teacherId, setTeacherId] = useState(initialHalqa?.teacherId ?? "");
  const [cohortId, setCohortId] = useState(initialHalqa?.cohortId ?? "");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const teachers = useMemo(() => {
    const byId = new Map<string, string>();
    for (const h of halaqat) if (!byId.has(h.teacherId)) byId.set(h.teacherId, h.teacherName);
    return Array.from(byId, ([id, name]) => ({ id, name }));
  }, [halaqat]);

  const cohortsForTeacher = useMemo(() => halaqat.filter((h) => h.teacherId === teacherId), [halaqat, teacherId]);
  const resolvedHalqa = halaqat.find((h) => h.teacherId === teacherId && h.cohortId === cohortId) ?? null;

  const todayLabel = formatDateAr(today());

  return (
    <Drawer
      open
      onClose={onClose}
      title={initial ? "تعديل بيانات طالب" : "تسجيل طالب جديد"}
      subtitle="نموذج التسجيل — تسجيل الطالب"
      footer={
        <>
          <button form="student-form" type="submit" disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ"}
          </button>
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 14, cursor: "pointer" }}>
            إلغاء
          </button>
        </>
      }
    >
      {state.error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {state.error}
        </div>
      )}

      <form id="student-form" action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <input type="hidden" name="halqaId" value={resolvedHalqa?.id ?? ""} />

        <PhotoField name="photo" label="صورة الطالب" existingUrl={initial?.photoUrl} />

        {initial && initial.guardianUsername && <GuardianBox student={initial} />}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <ReadOnly label="رقم الطالب" value={initial ? initial.no : "يُحدَّد تلقائيًا عند الحفظ"} />
          <ReadOnly label="تاريخ التسجيل" value={initial ? initial.registeredAt : todayLabel} />
          <Field label="اسم الطالب" name="name" defaultValue={initial?.name} />
          <Field label="اسم الوالد" name="father" defaultValue={initial?.father} />
          <Field label="اسم الوالدة" name="mother" defaultValue={initial?.mother} />
          <Field label="النسبة" name="familyName" defaultValue={initial?.familyName} />
          <Field label="المواليد" name="birth" type="date" defaultValue={initial?.birth} />
          <Field label="عنوان السكن" name="address" defaultValue={initial?.address} />
          <Field label="عمل الوالد الحالي" name="job" defaultValue={initial?.job} />
          <Field label="رقم هاتف الطالب" name="phone" defaultValue={initial?.phone} />
          <Field label="رقم ولي الأمر" name="guardianPhone" defaultValue={initial?.guardianPhone} required />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>المدرس</label>
            <Select
              value={teacherId}
              onChange={(v) => {
                setTeacherId(v);
                setCohortId("");
              }}
              options={teachers.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="اختاروا المدرس"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>الفوج</label>
            <Select
              value={cohortId}
              onChange={setCohortId}
              disabled={!teacherId}
              options={cohortsForTeacher.map((h) => ({ value: h.cohortId, label: h.cohortName }))}
              placeholder={teacherId ? "اختاروا الفوج" : "اختاروا المدرس أولًا"}
            />
          </div>
          <ReadOnly label="الحلقة" value={resolvedHalqa?.name ?? "—"} />
        </div>
      </form>

      {initial && <BehaviorSection student={initial} />}
    </Drawer>
  );
}

function BehaviorSection({ student }: { student: StudentRow }) {
  const router = useRouter();
  const [behavior, setBehavior] = useState(student.behavior);
  const [log, setLog] = useState(student.behaviorLog);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(student.behavior);
  const [note, setNote] = useState("");
  const [state, formAction, pending] = useActionState(saveBehavior, {} as BehaviorState);

  useEffect(() => {
    if (state.ok && state.behavior && state.logEntry) {
      setBehavior(state.behavior);
      setLog((prev) => [state.logEntry!, ...prev]);
      setEditing(false);
      setNote("");
      router.refresh();
    }
  }, [state, router]);

  return (
    <div style={{ padding: 14, borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-2-grad)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>سلوك الطالب</div>
        <Link href={`/reports/student?student=${student.id}`} style={{ fontSize: 12, color: "var(--ink-2)" }}>
          فتح تقرير هذا الطالب ←
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            padding: "5px 13px", borderRadius: 999, fontSize: 13, fontWeight: 600,
            border: `1px solid ${BEHAVIOR_COLORS[behavior] ?? "var(--line)"}`,
            color: BEHAVIOR_COLORS[behavior] ?? "var(--ink)",
          }}
        >
          {behavior}
        </span>
        {!editing && (
          <button type="button" onClick={() => { setEditing(true); setValue(behavior); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}>
            تعديل السلوك
          </button>
        )}
      </div>

      {editing && (
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="hidden" name="studentId" value={student.id} />
          <input type="hidden" name="value" value={value} />
          {state.error && (
            <div style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 12.5 }}>
              {state.error}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {BEHAVIOR.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setValue(b)}
                style={{
                  padding: "6px 13px", borderRadius: 999, fontSize: 12.5, cursor: "pointer",
                  border: `1px solid ${value === b ? BEHAVIOR_COLORS[b] : "var(--line)"}`,
                  background: value === b ? `${BEHAVIOR_COLORS[b]}22` : "transparent",
                  color: value === b ? BEHAVIOR_COLORS[b] : "var(--ink-2)",
                  fontWeight: value === b ? 600 : 400,
                }}
              >
                {b}
              </button>
            ))}
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>ملاحظة توضّح سبب التغيير — إلزامية</label>
            <textarea
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 13, resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={pending} style={{ ...primaryButtonStyle, padding: "8px 16px", fontSize: 12.5, opacity: pending ? 0.7 : 1 }}>
              {pending ? "جارٍ الحفظ…" : "حفظ"}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={{ padding: "8px 16px", borderRadius: 9, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 12.5, cursor: "pointer" }}>
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 6 }}>سجل التغييرات</div>
        {log.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>لم تُغيَّر الدرجة بعد — القيمة الافتراضية «ممتاز».</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {log.map((l, i) => (
              <div key={i} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", fontSize: 12 }}>
                <div>
                  <span style={{ color: BEHAVIOR_COLORS[l.previousValue] ?? "var(--ink-2)" }}>{l.previousValue}</span>
                  {" ← "}
                  <span style={{ color: BEHAVIOR_COLORS[l.newValue] ?? "var(--ink-2)", fontWeight: 600 }}>{l.newValue}</span>
                </div>
                <div style={{ color: "var(--ink-2)", marginTop: 2 }}>{l.note}</div>
                <div style={{ color: "var(--ink-3)", fontSize: 11, marginTop: 2 }}>{l.by} · {l.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  if (type === "date") {
    return <DateField label={label} name={name} defaultValue={defaultValue} width="100%" />;
  }
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>
        {label}
        {required && <span style={{ color: "#E08A8A" }}> *</span>}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        style={inputStyle()}
      />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>{label}</label>
      <input value={value} readOnly style={inputStyle(true)} />
    </div>
  );
}

/** بيانات دخول ولي الأمر — تظهر للإداريين فقط ليسلّموها له. */
function GuardianBox({ student }: { student: StudentRow }) {
  const [shown, setShown] = useState(false);
  const [password, setPassword] = useState(student.guardianPassword);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"user" | "pass" | null>(null);
  const router = useRouter();

  async function copy(text: string, which: "user" | "pass") {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    }
  }

  async function regenerate() {
    setBusy(true);
    const res = await resetGuardianPassword(student.id);
    setBusy(false);
    if (res.ok && res.password) {
      setPassword(res.password);
      setShown(true);
      router.refresh();
    }
  }

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: "var(--card-2-grad)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600 }}>دخول ولي الأمر</div>
      <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
        حساب أُنشئ تلقائيًا مع الطالب. سلّم ولي الأمر هذه البيانات ليتابع حضور ابنه وتسميعه.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>اسم المستخدم</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input readOnly value={student.guardianUsername} style={{ ...inputStyle(true), direction: "ltr", textAlign: "center", flex: 1 }} />
            <button
              type="button"
              onClick={() => copy(student.guardianUsername, "user")}
              style={{ padding: "0 12px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
            >
              {copied === "user" ? "نُسخ ✓" : "نسخ"}
            </button>
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>كلمة المرور</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              readOnly
              value={shown ? password : "••••••••••"}
              style={{ ...inputStyle(true), direction: "ltr", textAlign: "center", letterSpacing: shown ? "0.05em" : "0.2em", flex: 1 }}
            />
            <button
              type="button"
              onClick={() => copy(password, "pass")}
              style={{ padding: "0 12px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
            >
              {copied === "pass" ? "نُسخت ✓" : "نسخ"}
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setShown(!shown)}
          style={{ padding: "7px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
        >
          {shown ? "إخفاء" : "إظهار"}
        </button>
        <button
          type="button"
          onClick={regenerate}
          disabled={busy}
          style={{ padding: "7px 13px", borderRadius: 9, border: "1px dashed var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 12, cursor: "pointer", opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "جارٍ التوليد…" : "توليد كلمة مرور جديدة"}
        </button>
      </div>
    </div>
  );
}
