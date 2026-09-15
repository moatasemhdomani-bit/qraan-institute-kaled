"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveStudent, resetGuardianPassword, type FormState } from "./actions";
import { copyToClipboard } from "@/lib/clipboard";
import { inputStyle, primaryButtonStyle, cardStyle } from "@/lib/ui";
import Drawer from "@/components/Drawer";
import PhotoField from "@/components/PhotoField";

type StudentRow = {
  id: string;
  no: string;
  name: string;
  father: string;
  mother: string;
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
  guardianUsername: string;
  guardianPassword: string;
};

const initialState: FormState = {};

export default function StudentsClient({
  students,
  halaqat,
}: {
  students: StudentRow[];
  halaqat: { id: string; name: string; cohortName: string }[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);

  const filtered = useMemo(
    () => students.filter((s) => !search.trim() || s.name.includes(search.trim()) || s.no.includes(search.trim())),
    [students, search]
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
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line-2)" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الطالب"
            style={inputStyle()}
          />
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
                gridTemplateColumns: "0.5fr 1.2fr 0.9fr 2.4fr 90px",
                gap: 12,
                padding: "11px 16px",
                background: "var(--head-grad)",
                fontSize: 12,
                color: "var(--ink-2)",
                fontWeight: 600,
                minWidth: 620,
              }}
            >
              <div>رقم الطالب</div>
              <div>الاسم</div>
              <div>الحلقة</div>
              <div>الفوج</div>
              <div />
            </div>
            {filtered.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "0.5fr 1.2fr 0.9fr 2.4fr 90px",
                  gap: 12,
                  padding: "13px 16px",
                  borderTop: "1px solid var(--line-2)",
                  alignItems: "center",
                  fontSize: 14,
                  minWidth: 620,
                }}
              >
                <div style={{ color: "var(--ink-3)", fontSize: 13, direction: "ltr", textAlign: "right" }}>{s.no}</div>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ color: "var(--ink-2)", fontSize: 13 }}>{s.halqaName}</div>
                <div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--chip)", border: "1px solid var(--line)", fontSize: 12 }}>
                    {s.cohortName}
                  </span>
                </div>
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
              <div key={s.id} style={{ padding: "13px 14px", borderTop: "1px solid var(--line-2)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: 12, color: "var(--ink-3)", direction: "ltr" }}>#{s.no}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.halqaName}</span>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--chip)", border: "1px solid var(--line)", fontSize: 12 }}>
                      {s.cohortName}
                    </span>
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
  halaqat: { id: string; name: string; cohortName: string }[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveStudent, initialState);
  const [halqaId, setHalqaId] = useState(initial?.halqaId ?? "");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const selectedCohort = halaqat.find((h) => h.id === halqaId)?.cohortName ?? "—";
  const todayLabel = new Date().toLocaleDateString("ar-SY");

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

        <PhotoField name="photo" label="صورة الطالب" existingUrl={initial?.photoUrl} />

        {initial && initial.guardianUsername && <GuardianBox student={initial} />}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <ReadOnly label="رقم الطالب" value={initial ? initial.no : "يُحدَّد تلقائيًا عند الحفظ"} />
          <ReadOnly label="تاريخ التسجيل" value={initial ? initial.registeredAt : todayLabel} />
          <Field label="اسم الطالب" name="name" defaultValue={initial?.name} />
          <Field label="اسم الوالد" name="father" defaultValue={initial?.father} />
          <Field label="اسم الوالدة" name="mother" defaultValue={initial?.mother} />
          <Field label="المواليد" name="birth" type="date" defaultValue={initial?.birth} />
          <Field label="عنوان السكن" name="address" defaultValue={initial?.address} />
          <Field label="عمل الوالد الحالي" name="job" defaultValue={initial?.job} />
          <Field label="رقم هاتف الطالب" name="phone" defaultValue={initial?.phone} />
          <Field label="رقم ولي الأمر" name="guardianPhone" defaultValue={initial?.guardianPhone} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>الحلقة</label>
            <select name="halqaId" value={halqaId} onChange={(e) => setHalqaId(e.target.value)} style={inputStyle()}>
              <option value="" disabled>
                تُسحب من الحلقات المنشأة
              </option>
              {halaqat.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <ReadOnly label="الفوج" value={selectedCohort} />
        </div>
      </form>
    </Drawer>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
}) {
  const isDate = type === "date";
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={isDate ? { ...inputStyle(), textAlign: "center", direction: "ltr" } : inputStyle()}
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
