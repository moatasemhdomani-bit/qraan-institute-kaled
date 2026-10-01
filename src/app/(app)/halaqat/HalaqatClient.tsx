"use client";

import { useCallback, useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveHalqa, moveHalqaStudents, deleteHalqa, type FormState } from "./actions";
import { inputStyle, primaryButtonStyle, cardStyle, chipStyle } from "@/lib/ui";
import Drawer from "@/components/Drawer";
import Select from "@/components/Select";
import { HALQA_TRACKS, TRACK_LABELS, halqaWithTrack, type TrackId } from "@/lib/track";

type HalqaRow = { id: string; name: string; track: TrackId; teacherId: string; teacherName: string; cohortId: string; cohortName: string; count: number };
type TeacherOption = { id: string; name: string; track: TrackId };
type CohortRow = { id: string; name: string; isRotating: boolean };
const initialState: FormState = {};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: "8px 14px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)", display: "flex", alignItems: "baseline", gap: 7 }}>
      <span style={{ fontSize: 18, fontWeight: 700 }}>{value}</span>
      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{label}</span>
    </div>
  );
}

export default function HalaqatClient({
  halaqat,
  teachers,
  cohorts,
}: {
  halaqat: HalqaRow[];
  teachers: TeacherOption[];
  cohorts: CohortRow[];
}) {
  const router = useRouter();
  // null = مغلق؛ وإلا: الحلقة المعدَّلة أو قيم ابتدائية لحلقة جديدة
  const [halqaDrawer, setHalqaDrawer] = useState<{ editing: HalqaRow | null; cohortId?: string } | null>(null);
  const closeHalqa = useCallback(() => setHalqaDrawer(null), []);

  const totalStudents = halaqat.reduce((sum, h) => sum + h.count, 0);
  const canCreateHalqa = teachers.length > 0 && cohorts.length > 0;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Stat label="حلقة" value={halaqat.length} />
        <Stat label="فوج" value={cohorts.length} />
        <Stat label="طالبًا" value={totalStudents} />
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canCreateHalqa && (
            <button type="button" onClick={() => setHalqaDrawer({ editing: null })} style={primaryButtonStyle}>
              + إنشاء حلقة
            </button>
          )}
        </div>
      </div>

      {teachers.length === 0 && (
        <div style={{ ...cardStyle, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>لا يوجد مدرّسون بعد</div>
          <div style={{ color: "var(--ink-2)", fontSize: 13, marginBottom: 14 }}>الحلقة تُسند إلى مدرّس وفوج — أضف مدرّسًا أولًا.</div>
          <button type="button" onClick={() => router.push("/users")} style={primaryButtonStyle}>
            أضف مدرّسًا
          </button>
        </div>
      )}

      {cohorts.map((c) => {
        const list = halaqat.filter((h) => h.cohortId === c.id);
        const students = list.reduce((sum, h) => sum + h.count, 0);
        return (
          <section key={c.id} style={{ ...cardStyle, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                padding: "12px 16px",
                background: "var(--head-grad)",
                borderBottom: "1px solid var(--line-2)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700 }}>{c.name.startsWith("فوج") ? c.name : `فوج ${c.name}`}</div>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, border: "1px solid var(--line)", background: "var(--chip)", color: "var(--ink-2)" }}>
                {c.isRotating ? "قلّاب" : "ثابت"}
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                {list.length} حلقة · {students} طالبًا
              </span>
              <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {teachers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHalqaDrawer({ editing: null, cohortId: c.id })}
                    style={{ padding: "6px 12px", borderRadius: 9, border: "1px dashed var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}
                  >
                    + حلقة في هذا الفوج
                  </button>
                )}
              </div>
            </div>

            {list.length === 0 ? (
              <div style={{ padding: "18px 16px", fontSize: 13, color: "var(--ink-3)" }}>لا حلقات في هذا الفوج بعد.</div>
            ) : (
              <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>
                {list.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--line-2)",
                      background: "var(--card-2-grad)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, overflowWrap: "anywhere" }}>
                        {h.name}{" "}
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: h.track === "ARABIC" ? "var(--info)" : "var(--gold)" }}>({TRACK_LABELS[h.track]})</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-2)", overflowWrap: "anywhere" }}>المدرس: {h.teacherName}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{h.count} طالبًا</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHalqaDrawer({ editing: h })}
                      style={{ flex: "none", padding: "7px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}
                    >
                      تعديل
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {halqaDrawer && (
        <HalqaForm
          key={halqaDrawer.editing?.id ?? "new-" + (halqaDrawer.cohortId ?? "")}
          initial={halqaDrawer.editing}
          initialCohortId={halqaDrawer.cohortId}
          teachers={teachers}
          cohorts={cohorts}
          allHalaqat={halaqat}
          onClose={closeHalqa}
        />
      )}
    </>
  );
}

function HalqaForm({
  initial,
  initialCohortId,
  teachers,
  cohorts,
  allHalaqat,
  onClose,
}: {
  initial: HalqaRow | null;
  initialCohortId?: string;
  teachers: TeacherOption[];
  cohorts: CohortRow[];
  allHalaqat: HalqaRow[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveHalqa, initialState);
  const [track, setTrack] = useState<TrackId>(initial?.track ?? "QURAN");
  const [teacherId, setTeacherId] = useState(initial?.teacherId ?? "");
  const [cohortId, setCohortId] = useState(initial?.cohortId ?? initialCohortId ?? "");
  // مدرّس الحلقة من نوعها. عند تغيير نوع حلقة قائمة مع إبقاء مدرّسها، يبقى مدرّسها خيارًا (ينتقل معها إلى النوع الجديد)
  const typeChanging = !!initial && initial.track !== track;
  const trackTeachers = teachers.filter((t) => t.track === track || (typeChanging && t.id === initial?.teacherId));

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Drawer
      open
      onClose={onClose}
      title={initial ? "تعديل حلقة" : "إنشاء حلقة"}
      subtitle="اسم الحلقة ومدرّسها وفوجها"
      footer={
        <>
          <button form="halqa-form" type="submit" disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
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
      <form id="halqa-form" action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <input type="hidden" name="track" value={track} />
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 6 }}>نوع الحلقة</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {HALQA_TRACKS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTrack(t);
                  // حلقة جديدة: يُفرَّغ مدرّس من نوع آخر. حلقة قائمة: يبقى مدرّسها لينتقل معها
                  if (!initial && teachers.find((x) => x.id === teacherId)?.track !== t) setTeacherId("");
                  if (initial && t === initial.track) setTeacherId(initial.teacherId);
                }}
                style={chipStyle(track === t)}
              >
                {TRACK_LABELS[t]}
              </button>
            ))}
          </div>
          {typeChanging && teacherId === initial?.teacherId && (
            // للإعداد الأول — سيُحذف هذا الخيار لاحقًا
            <div style={{ fontSize: 12, color: "var(--bad-ink)", marginTop: 7, lineHeight: 1.6 }}>
              تغيير النوع إلى «{TRACK_LABELS[track]}» ينقل المدرّس «{initial?.teacherName}» وكل حلقاته وكل طلابها إلى هذا المستوى.
            </div>
          )}
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>اسم الحلقة</label>
          <input name="name" defaultValue={initial?.name} style={inputStyle()} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>المدرس</label>
          <Select
            name="teacherId"
            value={teacherId}
            onChange={setTeacherId}
            options={trackTeachers.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="من العاملين المسجّلين كمدرّس"
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>الفوج</label>
          <Select
            name="cohortId"
            value={cohortId}
            onChange={setCohortId}
            options={cohorts.map((c) => ({ value: c.id, label: `${c.name} — ${c.isRotating ? "قلّاب" : "ثابت"}` }))}
            placeholder="اختر الفوج"
          />
        </div>
      </form>
      {initial && <HalqaAdmin halqa={initial} others={allHalaqat.filter((h) => h.id !== initial.id)} onDone={onClose} />}
    </Drawer>
  );
}

/** نقل كل طلاب الحلقة إلى حلقة أخرى، وحذف الحلقة حين تفرغ من الطلاب. */
function HalqaAdmin({ halqa, others, onDone }: { halqa: HalqaRow; others: HalqaRow[]; onDone: () => void }) {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState<"move" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const small: React.CSSProperties = { padding: "9px 14px", borderRadius: 10, fontSize: 13, fontFamily: "inherit", cursor: "pointer" };

  async function run(kind: "move" | "delete") {
    setError("");
    setBusy(kind);
    const res = kind === "move" ? await moveHalqaStudents(halqa.id, target) : await deleteHalqa(halqa.id);
    setBusy(null);
    if (res.error) return setError(res.error);
    router.refresh();
    onDone();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16, borderTop: "1px solid var(--line-2)" }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>نقل كل طلاب الحلقة</div>
        <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 8 }}>
          {halqa.count > 0 ? `ينتقل كل طلابها (${halqa.count}) معًا إلى الحلقة المختارة — سجلاتهم السابقة تبقى محفوظة.` : "لا طلاب في هذه الحلقة."}
        </div>
        {halqa.count > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}>
              <Select
                value={target}
                onChange={setTarget}
                options={others.filter((h) => h.track === halqa.track).map((h) => ({ value: h.id, label: `${halqaWithTrack(h.name, h.track)} — ${h.teacherName} · ${h.cohortName}` }))}
                placeholder="اختر الحلقة الجديدة"
              />
            </div>
            <button
              type="button"
              disabled={!target || busy !== null}
              onClick={() => run("move")}
              style={{ ...small, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", opacity: !target || busy ? 0.6 : 1 }}
            >
              {busy === "move" ? "جارٍ النقل…" : "نقل الطلاب"}
            </button>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>حذف الحلقة</div>
        {halqa.count > 0 ? (
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>متاح فقط حين لا يبقى فيها طلاب — انقلوا طلابها أولًا.</div>
        ) : !confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            style={{ ...small, border: "1px solid var(--notice-line)", background: "transparent", color: "var(--bad)" }}
          >
            حذف الحلقة
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "var(--bad)" }}>حذف «{halqa.name}» نهائيًا؟</span>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("delete")}
              style={{ ...small, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", color: "var(--ink)" }}
            >
              {busy === "delete" ? "…" : "نعم، احذف"}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} style={{ ...small, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)" }}>
              تراجع
            </button>
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: 12.5, color: "var(--bad)" }}>{error}</div>}
    </div>
  );
}
