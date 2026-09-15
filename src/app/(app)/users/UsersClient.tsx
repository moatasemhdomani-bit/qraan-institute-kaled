"use client";

import { useMemo, useState, useActionState, useEffect } from "react";
import { saveStaff, deleteStaff, type FormState } from "./actions";
import { chipStyle, inputStyle, primaryButtonStyle, cardStyle, ROLE_LABELS, type RoleId } from "@/lib/ui";
import Drawer from "@/components/Drawer";
import PhotoField from "@/components/PhotoField";
import PasswordField from "@/components/PasswordField";

type StaffRow = {
  id: string;
  name: string;
  role: RoleId;
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
  cohortIds: string[];
};

const STAFF_ROLES: RoleId[] = ["DIRECTOR", "ADMIN", "TEACHER", "EXAMINER"];
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
  const [roleFilter, setRoleFilter] = useState<"ALL" | RoleId>("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);

  const filtered = useMemo(
    () =>
      staff
        .filter((u) => !search.trim() || u.name.includes(search.trim()))
        .filter((u) => roleFilter === "ALL" || u.role === roleFilter),
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
          تسجيل عامل جديد
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
            {STAFF_ROLES.map((r) => (
              <button key={r} style={chipStyle(roleFilter === r)} onClick={() => setRoleFilter(r)}>
                {ROLE_LABELS[r]}
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
              تسجيل عامل جديد
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
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
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
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <div style={{ color: "var(--ink-2)", fontSize: 13, direction: "ltr", textAlign: "right" }}>{u.phone || "—"}</div>
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
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{u.name}</span>
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
                        {ROLE_LABELS[u.role]}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", direction: "ltr", textAlign: "right" }}>{u.phone || "—"}</div>
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
          ? "بصفتك مدير المعهد: تسند أي دور، وتعدّل أي حساب، ويظهر زر «حذف الحساب» عند تعديل حساب إداري."
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
  const [role, setRole] = useState<RoleId>(initial?.role ?? "TEACHER");
  const [cohortIds, setCohortIds] = useState<string[]>(initial?.cohortIds ?? []);
  const [deleteState, deleteAction, deletePending] = useActionState(
    async (_prev: FormState, _f: FormData): Promise<FormState> =>
      initial ? deleteStaff(initial.id) : { error: "" },
    initialState
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);
  useEffect(() => {
    if (deleteState.ok) onClose();
  }, [deleteState.ok, onClose]);

  const showDelete = isDirector && !!initial && initial.role === "ADMIN";

  return (
    <Drawer
      open
      onClose={onClose}
      title={initial ? "تعديل حساب عامل" : "تسجيل عامل جديد"}
      subtitle="نموذج التسجيل — إدارة المستخدمين"
      footer={
        <>
          <button form="staff-form" type="submit" disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ"}
          </button>
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 14, cursor: "pointer" }}>
            إلغاء
          </button>
          {showDelete && (
            <form action={deleteAction} style={{ marginInlineStart: "auto" }}>
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
                حذف الحساب
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

      <form id="staff-form" action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <input type="hidden" name="role" value={role} />
        {cohortIds.map((c) => (
          <input key={c} type="hidden" name="cohortIds" value={c} />
        ))}

        <PhotoField name="photo" label={initial ? "صورة شخصية" : "صورة شخصية"} existingUrl={initial?.photoUrl} />

        <div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 8 }}>الدور</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(["DIRECTOR", "ADMIN", "TEACHER", "EXAMINER"] as RoleId[]).map((r) => {
              const locked = r === "DIRECTOR" && !isDirector;
              const on = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={locked}
                  title={locked ? "إسناد هذا الدور من اختصاص مدير المعهد" : ""}
                  onClick={() => setRole(r)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    border: locked ? "1px dashed var(--line)" : on ? "1px solid var(--accent-line)" : "1px solid var(--line)",
                    background: locked ? "transparent" : on ? "var(--btn-grad)" : "var(--btn-soft)",
                    color: locked ? "var(--ink-3)" : on ? "var(--on-accent)" : "var(--ink-2)",
                    opacity: locked ? 0.6 : 1,
                    fontWeight: on && !locked ? 600 : 400,
                    cursor: locked ? "not-allowed" : "pointer",
                  }}
                >
                  {ROLE_LABELS[r]}
                  {locked ? " · مقفل" : ""}
                </button>
              );
            })}
          </div>
          {!isDirector && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>
              يمكنك إسناد أي دور عدا «مدير المعهد»، ولا يمكنك نقل حساب قائم إلى هذا الدور — صلاحية مدير المعهد وحده.
            </div>
          )}
        </div>

        {!initial && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            <Field label="اسم المستخدم" name="username" />
            <PasswordField label="كلمة المرور" name="password" autoComplete="new-password" />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <Field label="الاسم" name="name" defaultValue={initial?.name} />
          <Field label="اسم الأب" name="father" defaultValue={initial?.father} />
          <Field label="اسم الأم" name="mother" defaultValue={initial?.mother} />
          <Field label="النسبة (الكنية/العائلة)" name="family" defaultValue={initial?.family} />
          <Field label="رقم التواصل" name="phone" defaultValue={initial?.phone} placeholder="09XX XXX XXX" />
          <Field label="تاريخ الميلاد" name="birth" defaultValue={initial?.birth} placeholder="يوم/شهر/سنة" />
          <Field label="الرقم الوطني" name="nid" defaultValue={initial?.nid} />
          <Field label="عنوان السكن" name="address" defaultValue={initial?.address} />
          <Field label="العمل الحالي" name="job" defaultValue={initial?.job} />
          <Field label="الحالة الاجتماعية" name="marital" defaultValue={initial?.marital} />
          <Field label="التحصيل العلمي" name="education" defaultValue={initial?.education} />
          <Field label="المستوى القرآني" name="quran" defaultValue={initial?.quran} />
        </div>

        {role === "TEACHER" && (
          <div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 4 }}>الأفواج التي يمكنه التدريس فيها</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>اختيار متعدد.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {cohorts.map((c) => {
                const on = cohortIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCohortIds((prev) => (on ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
                    style={chipStyle(on)}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} style={inputStyle()} />
    </div>
  );
}
