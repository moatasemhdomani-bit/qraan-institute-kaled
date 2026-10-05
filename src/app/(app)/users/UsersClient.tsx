"use client";

import { useMemo, useState, useActionState, useEffect, startTransition } from "react";
import { saveStaff, deleteStaff, setStaffSuspended, type FormState } from "./actions";
import { chipStyle, inputStyle, primaryButtonStyle, cardStyle, ROLE_LABELS, type RoleId } from "@/lib/ui";
import { staffRoleLabel, type TrackId } from "@/lib/track";

/** أنواع الموظفين كما تظهر للمستخدم: الدور مع نوع التدريس (قرآن / قراءة عربية) للمدرّس والمختبِر. */
const STAFF_KINDS: { id: string; role: RoleId; track: TrackId }[] = [
  { id: "DIRECTOR", role: "DIRECTOR", track: "QURAN" },
  { id: "ADMIN", role: "ADMIN", track: "QURAN" },
  { id: "TEACHER_AR", role: "TEACHER", track: "ARABIC" },
  { id: "TEACHER_AMMA", role: "TEACHER", track: "AMMA" },
  { id: "TEACHER", role: "TEACHER", track: "QURAN" },
  { id: "EXAMINER", role: "EXAMINER", track: "QURAN" },
  { id: "EXAMINER_AR", role: "EXAMINER", track: "ARABIC" },
  { id: "EXAM_SUPERVISOR", role: "EXAM_SUPERVISOR", track: "QURAN" },
];

/** دور الموظف في فوج: kind من STAFF_KINDS. */
type Assignment = { cohortId: string; kind: string };
/** ملخّص أدوار الموظف في الأفواج للقائمة: «مدرس قرآن (ثابت 1، قلّاب 2) · مختبِر قرآن (ثابت 3)». */
function assignmentsSummary(assignments: Assignment[], cohorts: { id: string; name: string }[]): string {
  const byKind = new Map<string, string[]>();
  for (const a of assignments) {
    const name = cohorts.find((c) => c.id === a.cohortId)?.name ?? "";
    byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), name]);
  }
  const all = cohorts.length;
  return [...byKind]
    .map(([kind, names]) => {
      const k = STAFF_KINDS.find((x) => x.id === kind);
      const label = k ? kindLabel(k) : kind;
      return names.length === all ? `${label} (كل الأفواج)` : `${label} (${names.join("، ")})`;
    })
    .join(" · ");
}
const kindLabel = (k: (typeof STAFF_KINDS)[number]) => staffRoleLabel(k.role, k.track, ROLE_LABELS);
import Drawer from "@/components/Drawer";
import PhotoField from "@/components/PhotoField";
import PasswordField from "@/components/PasswordField";
import DateField from "@/components/DateField";
import PhoneField from "@/components/PhoneField";
import { formatMobile } from "@/lib/phone";
import Select from "@/components/Select";
import { cleanNationalId, MARITAL_OPTIONS, EDUCATION_OPTIONS, QURAN_LEVEL_OPTIONS } from "@/lib/staff";

type StaffRow = {
  id: string;
  name: string;
  fullName: string;
  username: string;
  role: RoleId;
  track: TrackId;
  phone: string;
  photoUrl: string | null;
  father: string;
  mother: string;
  family: string;
  birth: string;
  nid: string;
  address: string;
  job: string;
  marital: string;
  education: string;
  quran: string;
  halqaLabel: string;
  assignments: Assignment[];
  currentPassword: string;
  suspended: boolean;
};

function SuspendedBadge() {
  return (
    <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, border: "1px solid var(--danger-line)", color: "var(--danger)", flex: "none" }}>
      معلَّق
    </span>
  );
}

const initialState: FormState = {};

export default function UsersClient({
  staff,
  cohorts,
  isDirector,
}: {
  staff: StaffRow[];
  cohorts: { id: string; name: string }[];
  isDirector: boolean;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);

  const filtered = useMemo(
    () =>
      staff
        .filter((u) => !search.trim() || u.fullName.includes(search.trim()))
        .filter((u) => roleFilter === "ALL" || u.assignments.some((a) => a.kind === roleFilter)),
    [staff, search, roleFilter]
  );

  function openNew() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(u: StaffRow) {
    setEditing(u);
    setDrawerOpen(true);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={openNew} style={primaryButtonStyle}>
          إضافة موظف جديد
        </button>
      </div>

      <div style={{ ...cardStyle, overflow: "auto" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "14px 16px", borderBottom: "1px solid var(--line-2)" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم"
            style={{ ...inputStyle(), flex: 1, minWidth: 180 }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={chipStyle(roleFilter === "ALL")} onClick={() => setRoleFilter("ALL")}>
              الكل
            </button>
            {STAFF_KINDS.map((k) => (
              <button key={k.id} style={chipStyle(roleFilter === k.id)} onClick={() => setRoleFilter(k.id)}>
                {kindLabel(k)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>لا يوجد عاملون بعد</div>
            <div style={{ color: "var(--ink-2)", fontSize: 13, marginBottom: 16 }}>
              ابدأ بتسجيل المدرّسين — بقية الشاشات تُبنى على قائمتهم.
            </div>
            <button onClick={openNew} style={primaryButtonStyle}>
              إضافة موظف جديد
            </button>
          </div>
        ) : (
          <>
          <div className="list-table-wrap">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.9fr 1fr 1.1fr 96px",
                gap: 12,
                padding: "11px 16px",
                background: "var(--head-grad)",
                fontSize: 12,
                color: "var(--ink-2)",
                fontWeight: 600,
                minWidth: 620,
              }}
            >
              <div>الاسم</div>
              <div>الدور</div>
              <div>رقم التواصل</div>
              <div>الحلقة / الفوج</div>
              <div />
            </div>
            {filtered.map((u) => {
              const locked = u.role === "DIRECTOR" && !isDirector;
              return (
                <div
                  key={u.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 0.9fr 1fr 1.1fr 96px",
                    gap: 12,
                    padding: "13px 16px",
                    borderTop: "1px solid var(--line-2)",
                    alignItems: "center",
                    fontSize: 14,
                    minWidth: 620,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 99,
                        flex: "none",
                        background: "var(--chip)",
                        border: "1px solid var(--line)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: "var(--ink-2)",
                        overflow: "hidden",
                      }}
                    >
                      {u.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        u.name.charAt(0)
                      )}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.fullName}</span>
                    {u.suspended && <SuspendedBadge />}
                  </div>
                  <div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        border: "1px solid var(--line)",
                        background: u.role === "DIRECTOR" ? "var(--chip-strong)" : "var(--chip)",
                        color: u.role === "DIRECTOR" ? "var(--ink)" : "var(--ink-2)",
                        fontWeight: u.role === "DIRECTOR" ? 600 : 400,
                      }}
                    >
                      {assignmentsSummary(u.assignments, cohorts)}
                    </span>
                  </div>
                  <div style={{ color: "var(--ink-2)", fontSize: 13, direction: "ltr", textAlign: "right" }}>{u.phone ? formatMobile(u.phone) : "—"}</div>
                  <div style={{ color: "var(--ink-2)", fontSize: 13 }}>{u.halqaLabel}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      title={locked ? "صلاحية مدير المعهد فقط" : "تعديل الحساب"}
                      disabled={locked}
                      onClick={() => openEdit(u)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        border: "1px solid var(--line)",
                        background: locked ? "transparent" : "var(--btn-soft)",
                        color: locked ? "var(--ink-3)" : "var(--ink)",
                        opacity: locked ? 0.55 : 1,
                        cursor: locked ? "not-allowed" : "pointer",
                      }}
                    >
                      {locked ? "مقيّد" : "تعديل"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="list-cards">
            {filtered.map((u) => {
              const locked = u.role === "DIRECTOR" && !isDirector;
              return (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 14px", borderTop: "1px solid var(--line-2)" }}>
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 99,
                      flex: "none",
                      background: "var(--chip)",
                      border: "1px solid var(--line)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      color: "var(--ink-2)",
                      overflow: "hidden",
                    }}
                  >
                    {u.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      u.name.charAt(0)
                    )}
                  </span>
                  <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{u.fullName}</span>
                      {u.suspended && <SuspendedBadge />}
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          border: "1px solid var(--line)",
                          background: u.role === "DIRECTOR" ? "var(--chip-strong)" : "var(--chip)",
                          color: u.role === "DIRECTOR" ? "var(--ink)" : "var(--ink-2)",
                          fontWeight: u.role === "DIRECTOR" ? 600 : 400,
                        }}
                      >
                        {assignmentsSummary(u.assignments, cohorts)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", direction: "ltr", textAlign: "right" }}>{u.phone ? formatMobile(u.phone) : "—"}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{u.halqaLabel}</div>
                  </div>
                  <button
                    title={locked ? "صلاحية مدير المعهد فقط" : "تعديل الحساب"}
                    disabled={locked}
                    onClick={() => openEdit(u)}
                    style={{
                      flex: "none",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      border: "1px solid var(--line)",
                      background: locked ? "transparent" : "var(--btn-soft)",
                      color: locked ? "var(--ink-3)" : "var(--ink)",
                      opacity: locked ? 0.55 : 1,
                      cursor: locked ? "not-allowed" : "pointer",
                    }}
                  >
                    {locked ? "مقيّد" : "تعديل"}
                  </button>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
        {isDirector
          ? "بصفتك مدير المعهد: تسند أي دور، وتعدّل أي حساب، ويظهر زرّا «تعليق الموظف» و«حذف الموظف» عند فتح أي حساب. المعلَّق لا يدخل الموقع وتبقى بياناته كاملة، ويمكن إلغاء تعليقه."
          : "بصفتك إداريًا: تسجّل عاملًا جديدًا وتسند له أي دور عدا «مدير المعهد»، ولا تعدّل حساب مدير المعهد ولا تنقل حسابًا إلى دوره."}
      </div>

      {drawerOpen && (
        <StaffForm
          key={editing?.id ?? "new"}
          initial={editing}
          cohorts={cohorts}
          isDirector={isDirector}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}

function StaffForm({
  initial,
  cohorts,
  isDirector,
  onClose,
}: {
  initial: StaffRow | null;
  cohorts: { id: string; name: string }[];
  isDirector: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveStaff, initialState);
  // الدور في كل فوج — الموظف قد يأخذ أدوارًا مختلفة باختلاف الأفواج («» = لا دور له في هذا الفوج)
  const [roles, setRoles] = useState<Record<string, string>>(
    () => Object.fromEntries((initial?.assignments ?? []).map((a) => [a.cohortId, a.kind])) as Record<string, string>
  );
  const assignments: Assignment[] = cohorts.filter((c) => roles[c.id]).map((c) => ({ cohortId: c.id, kind: roles[c.id] }));
  const kindOptions = [
    { value: "", label: "— لا دور في هذا الفوج —" },
    ...STAFF_KINDS.filter((k) => isDirector || k.role !== "DIRECTOR").map((k) => ({ value: k.id, label: kindLabel(k) })),
  ];
  // تأكيد قبل «حذف الموظف» أو «تعليق الموظف» (أو إلغاء تعليقه)
  const [confirmAction, setConfirmAction] = useState<null | "delete" | "suspend">(null);
  const [deleteState, deleteAction, deletePending] = useActionState(
    async (_prev: FormState, _f: FormData): Promise<FormState> => {
      if (!initial) return { error: "" };
      return confirmAction === "suspend" ? setStaffSuspended(initial.id, !initial.suspended) : deleteStaff(initial.id);
    },
    initialState
  );
  const [marital, setMarital] = useState(initial?.marital ?? "");
  const [education, setEducation] = useState(initial?.education ?? "");
  const [quran, setQuran] = useState(initial?.quran ?? "");
  const [nid, setNid] = useState(initial?.nid ?? "");
  // قيمة قديمة مكتوبة نصًّا حرًّا قبل القوائم المنسدلة تبقى خيارًا ظاهرًا كي لا تضيع
  const withExisting = (opts: string[], existing?: string) =>
    (existing && !opts.includes(existing) ? [existing, ...opts] : opts).map((o) => ({ value: o, label: o }));
  const req = !initial;

  useEffect(() => {
    if (state.ok && !state.generatedPassword) onClose();
  }, [state.ok, state.generatedPassword, onClose]);
  useEffect(() => {
    if (deleteState.ok) onClose();
  }, [deleteState.ok, onClose]);

  const showDelete = isDirector && !!initial;

  return (
    <Drawer
      open
      onClose={onClose}
      title={initial ? "تعديل حساب عامل" : "إضافة موظف جديد"}
      subtitle="نموذج التسجيل — إدارة المستخدمين"
      footer={
        <>
          <button form="staff-form" type="submit" disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ"}
          </button>
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 14, cursor: "pointer" }}>
            إلغاء
          </button>
          {showDelete && !confirmAction && (
            <button
              type="button"
              onClick={() => setConfirmAction("suspend")}
              style={{
                marginInlineStart: "auto",
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid var(--line)",
                background: "transparent",
                color: "var(--ink-2)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {initial?.suspended ? "إلغاء التعليق" : "تعليق الموظف"}
            </button>
          )}
          {showDelete && !confirmAction && (
            <button
              type="button"
              onClick={() => setConfirmAction("delete")}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid var(--danger-line)",
                background: "transparent",
                color: "var(--danger)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              حذف الموظف
            </button>
          )}
          {showDelete && confirmAction && (
            <form action={deleteAction} style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, color: "var(--danger)" }}>
                {confirmAction === "delete"
                  ? `حذف الموظف «${initial?.name}» نهائيًا؟`
                  : initial?.suspended
                    ? `إلغاء تعليق «${initial?.name}» — يعود إليه الدخول؟`
                    : `تعليق «${initial?.name}» — لا يدخل الموقع وتبقى بياناته كاملة؟`}
              </span>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}
              >
                تراجع
              </button>
              <button
                type="submit"
                disabled={deletePending}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--danger-line)",
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {deletePending ? "جارٍ التنفيذ…" : confirmAction === "delete" ? "نعم، احذف" : initial?.suspended ? "نعم، ألغِ التعليق" : "نعم، علّق"}
              </button>
            </form>
          )}
        </>
      }
    >
      {(state.error || deleteState.error) && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {state.error || deleteState.error}
        </div>
      )}

      {state.ok && state.generatedPassword && (
        <div style={{ padding: "14px", borderRadius: 11, border: "1px solid rgba(111,191,139,0.4)", background: "rgba(111,191,139,0.1)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ok)" }}>تم إنشاء الحساب — كلمة المرور المولَّدة:</div>
          <PasswordField name="generatedPasswordView" defaultValue={state.generatedPassword} />
          <div style={{ fontSize: 12, color: "var(--ink-2)" }}>احفظوها الآن — لن تظهر بهذا الشكل مرة أخرى إلا من هنا عند التعديل لاحقًا.</div>
          <button
            type="button"
            onClick={onClose}
            style={{ ...primaryButtonStyle, alignSelf: "flex-start", padding: "8px 18px", fontSize: 13 }}
          >
            تم، إغلاق
          </button>
        </div>
      )}

      {/* إرسال بلا تفريغ تلقائي للحقول: إن رُفض الحفظ (معلومة ناقصة) يبقى كل ما كُتب كما هو */}
      <form
        id="staff-form"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <input type="hidden" name="assignmentsJson" value={JSON.stringify(assignments)} />

        <PhotoField name="photo" label={initial ? "صورة شخصية" : "صورة شخصية"} existingUrl={initial?.photoUrl} />

        <div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 4 }}>الدور في كل فوج</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>
            قد يختلف دور الموظف باختلاف الأفواج — ويتنقّل بين حساباته أعلى الشاشة. الأفواج ذات الدور نفسه تجتمع في حساب واحد.
          </div>
          <div style={{ marginBottom: 10, maxWidth: 360 }}>
            <Select
              value=""
              onChange={(v) => setRoles(Object.fromEntries(cohorts.map((c) => [c.id, v])))}
              options={[{ value: "", label: "تطبيق دور واحد على كل الأفواج…" }, ...kindOptions.slice(1)]}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cohorts.map((c) => (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr)", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</span>
                <Select value={roles[c.id] ?? ""} onChange={(v) => setRoles((prev) => ({ ...prev, [c.id]: v }))} options={kindOptions} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <Field label="اسم المستخدم" name="username" defaultValue={initial?.username} required={req} />
          {initial ? (
            <PasswordField label="كلمة المرور الحالية" name="currentPasswordView" defaultValue={initial.currentPassword} readOnly />
          ) : (
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>كلمة المرور</div>
              <div style={{ padding: "11px 13px", borderRadius: 10, border: "1px dashed var(--line)", fontSize: 12.5, color: "var(--ink-3)" }}>
                تُولَّد تلقائيًا كلمة مرور قوية عند الحفظ، وتظهر لكم مباشرة لتسليمها للموظف.
              </div>
            </div>
          )}
        </div>

        {initial && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            <PasswordField
              label="كلمة مرور جديدة"
              name="password"
              autoComplete="new-password"
              placeholder="اتركوه فارغًا للإبقاء على كلمة المرور الحالية"
            />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <Field label="الاسم" name="name" defaultValue={initial?.name} required />
          <Field label="اسم الأب" name="father" defaultValue={initial?.father} required={req} />
          <Field label="اسم الأم" name="mother" defaultValue={initial?.mother} required={req} />
          <Field label="النسبة (الكنية/العائلة)" name="family" defaultValue={initial?.family} required={req} />
          <PhoneField label={req ? "رقم التواصل *" : "رقم التواصل"} name="phone" defaultValue={initial?.phone} />
          <Field label={req ? "تاريخ الميلاد *" : "تاريخ الميلاد"} name="birth" type="date" defaultValue={initial?.birth} />
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>الرقم الوطني{req ? " *" : ""}</label>
            {/* أرقام فقط، ويبقى الصفر على اليسار (يُحفظ نصًّا) */}
            <input
              name="nid"
              value={nid}
              onChange={(e) => setNid(cleanNationalId(e.target.value))}
              inputMode="numeric"
              dir="ltr"
              placeholder="أرقام فقط"
              style={{ ...inputStyle(), textAlign: "right" }}
            />
          </div>
          <Field label="عنوان السكن" name="address" defaultValue={initial?.address} required={req} />
          <Field label="العمل الحالي" name="job" defaultValue={initial?.job} required={req} />
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>الحالة الاجتماعية{req ? " *" : ""}</label>
            <Select name="marital" value={marital} onChange={setMarital} options={withExisting(MARITAL_OPTIONS, initial?.marital)} />
            <input type="hidden" name="maritalExisting" value={initial?.marital ?? ""} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>التحصيل العلمي{req ? " *" : ""}</label>
            <Select name="education" value={education} onChange={setEducation} options={withExisting(EDUCATION_OPTIONS, initial?.education)} />
            <input type="hidden" name="educationExisting" value={initial?.education ?? ""} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>المستوى القرآني{req ? " *" : ""}</label>
            <Select name="quran" value={quran} onChange={setQuran} options={withExisting(QURAN_LEVEL_OPTIONS, initial?.quran)} />
            <input type="hidden" name="quranExisting" value={initial?.quran ?? ""} />
          </div>
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
  required = false,
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
        {required ? " *" : ""}
      </label>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} style={inputStyle()} />
    </div>
  );
}
