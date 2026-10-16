"use client";

import { useState, useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cardStyle, chipStyle, inputStyle, primaryButtonStyle, softButtonStyle } from "@/lib/ui";
import Drawer from "@/components/Drawer";
import DateField from "@/components/DateField";
import { createAwqafBatch, deleteAwqafBatch, type FormState } from "./actions";
import { today } from "@/lib/daily";

type Candidate = { id: string; no: number; name: string; nominationDate: string; nominationPresent: boolean; priorFailNote: string | null };
type SunnahCandidate = { key: string; studentId: string; section: string; level: number; no: number; name: string; label: string; note: string };
type BatchKind = "QURAN" | "SUNNAH";
const KIND_LABEL: Record<string, string> = { QURAN: "القرآن الكريم", SUNNAH: "السنّة النبوية" };
type Batch = {
  id: string;
  kind: string;
  date: string;
  studentCount: number;
  scoredCount: number;
  allScored: boolean;
  passedCount: number;
  arrivedCount: number;
  archivedCount: number;
  deliveredCount: number;
};
type SearchStudent = {
  id: string;
  no: number;
  name: string;
  history: { batchDate: string; score: number | null; passed: boolean | null; certLabel: string }[];
};

function batchBadge(b: Batch) {
  if (!b.allScored) return { label: "بانتظار العلامات", color: "var(--gold)" };
  if (b.passedCount === 0) return { label: "لا ناجحين في هذه الدفعة", color: "var(--ink-3)" };
  if (b.deliveredCount === b.passedCount) return { label: "دورة الشهادة مكتملة", color: "var(--ok)" };
  return { label: "دورة الشهادة جارية", color: "var(--info)" };
}

export default function AwqafBatchesClient({
  candidates,
  sunnahCandidates,
  batches,
  searchStudents,
}: {
  candidates: Candidate[];
  sunnahCandidates: SunnahCandidate[];
  batches: Batch[];
  searchStudents: SearchStudent[];
}) {
  const router = useRouter();
  // «دفعة جديدة»: يُختار النوع أولًا — القرآن الكريم أو السنّة النبوية
  const [newBatchOpen, setNewBatchOpen] = useState<null | "choose" | BatchKind>(null);
  const [search, setSearch] = useState("");
  const [fileStudent, setFileStudent] = useState<SearchStudent | null>(null);

  const hits = search.trim() ? searchStudents.filter((s) => s.name.includes(search.trim()) || String(s.no).includes(search.trim())) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...cardStyle, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
          الاختبار تُجريه جهة الأوقاف خارج المعهد بالكامل — لا شاشة له ولا حساب. ما يُدار هنا: اختيار الدفعة قبله، وإدخال علاماتها
          ودورة شهاداتها بعده.
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
          حدّ النجاح: <b style={{ color: "var(--ink)" }}>90</b> حاضرًا (تلاوة) و<b style={{ color: "var(--ink)" }}>80</b> غيبًا (حفظ) — بحسب مسار ترشيح كل طالب.
        </div>
        {newBatchOpen === "choose" ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--ink-2)" }}>دفعة جديدة لـ:</span>
            <button type="button" onClick={() => setNewBatchOpen("QURAN")} style={{ ...primaryButtonStyle, padding: "10px 18px" }}>
              القرآن الكريم
            </button>
            <button type="button" onClick={() => setNewBatchOpen("SUNNAH")} style={{ ...primaryButtonStyle, padding: "10px 18px" }}>
              السنّة النبوية
            </button>
            <button type="button" onClick={() => setNewBatchOpen(null)} style={{ ...softButtonStyle, background: "transparent" }}>
              إلغاء
            </button>
          </div>
        ) : (
          <button onClick={() => setNewBatchOpen("choose")} style={{ ...primaryButtonStyle, alignSelf: "flex-start" }}>
            دفعة جديدة
          </button>
        )}
      </div>

      <div style={{ ...cardStyle, padding: "12px 14px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث مباشر عن طالب بالاسم أو الرقم"
          style={inputStyle()}
        />
        {hits.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {hits.map((s) => (
              <button
                key={s.id}
                onClick={() => setFileStudent(s)}
                style={{ textAlign: "start", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--card-2-grad)", color: "var(--ink)", fontSize: 13.5, cursor: "pointer" }}
              >
                {s.name} <span style={{ color: "var(--ink-3)", fontSize: 11 }}>#{s.no}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {batches.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>لا توجد دفعات بعد.</div>
      ) : (
        batches.map((b) => {
          const badge = batchBadge(b);
          return (
            <div key={b.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Link
              href={`/exams/awqaf-batches/${b.id}`}
              style={{ ...cardStyle, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, textDecoration: "none", color: "var(--ink)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>دفعة {b.date}</span>
                <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11.5, border: "1px solid var(--line)", color: "var(--ink-2)" }}>{KIND_LABEL[b.kind] ?? b.kind}</span>
                <span
                  style={{
                    marginInlineStart: "auto",
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    border: `1px solid color-mix(in srgb, ${badge.color} 40%, transparent)`,
                    color: badge.color,
                    background: `color-mix(in srgb, ${badge.color} 10%, transparent)`,
                  }}
                >
                  {badge.label}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                {b.studentCount} طالبًا · {b.allScored ? "العلامات مكتملة" : `العلامات ${b.scoredCount} من ${b.studentCount}`}
              </div>
              {b.allScored && b.passedCount > 0 && (
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  وصل {b.arrivedCount} · أُرشف {b.archivedCount} · سُلّم {b.deliveredCount}
                </div>
              )}
            </Link>
            <DeleteBatch id={b.id} label={`دفعة ${b.date} — ${KIND_LABEL[b.kind] ?? b.kind} (${b.studentCount} طالبًا)`} />
            </div>
          );
        })
      )}

      {(newBatchOpen === "QURAN" || newBatchOpen === "SUNNAH") && (
        <NewBatchDrawer
          kind={newBatchOpen}
          items={
            newBatchOpen === "QURAN"
              ? candidates.map((x) => ({ key: x.id, no: x.no, name: x.name, tag: x.nominationPresent ? "حاضرًا" : "غيبًا", note: x.priorFailNote }))
              : sunnahCandidates.map((x) => ({ key: x.key, no: x.no, name: x.name, tag: x.label, note: x.note }))
          }
          onClose={() => setNewBatchOpen(null)}
          onCreated={(id) => router.push(`/exams/awqaf-batches/${id}`)}
        />
      )}

      {fileStudent && (
        <Drawer open onClose={() => setFileStudent(null)} title={fileStudent.name} subtitle={`#${fileStudent.no}`}>
          {fileStudent.history.length === 0 ? (
            <div style={{ padding: "30px 16px", borderRadius: 12, border: "1px dashed var(--line)", background: "var(--card-2-grad)", textAlign: "center", fontSize: 13, color: "var(--ink-2)" }}>
              لا سجل سبر أوقاف لهذا الطالب بعد.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {fileStudent.history.map((h, i) => (
                <div key={i} style={{ padding: "13px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-2-grad)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{h.score != null ? `${h.score} / 100` : "بانتظار العلامة"}</span>
                    {h.passed != null && (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 700,
                          border: `1px solid ${h.passed ? "rgba(111,191,139,0.5)" : "rgba(224,138,138,0.5)"}`,
                          color: h.passed ? "var(--ok)" : "var(--bad)",
                        }}
                      >
                        {h.passed ? "ناجح" : "إعادة"}
                      </span>
                    )}
                    <span style={{ marginInlineStart: "auto", fontSize: 12, color: "var(--ink-3)", direction: "ltr" }}>{h.batchDate}</span>
                  </div>
                  {h.passed && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{h.certLabel}</div>}
                </div>
              ))}
            </div>
          )}
        </Drawer>
      )}
    </div>
  );
}

type Item = { key: string; no: number; name: string; tag: string; note: string | null };

function NewBatchDrawer({
  kind,
  items: candidates,
  onClose,
  onCreated,
}: {
  kind: BatchKind;
  items: Item[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [date, setDate] = useState(today());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState<FormState, FormData>(createAwqafBatch, {});

  useEffect(() => {
    if (state.ok && state.batchId) onCreated(state.batchId);
  }, [state.ok, state.batchId, onCreated]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Drawer open onClose={onClose} title={`دفعة سبر أوقاف جديدة — ${KIND_LABEL[kind]}`} subtitle={`${candidates.length} طالبًا ناجحًا في سبر ترشيح الأوقاف`}>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="kind" value={kind} />
        {kind === "QURAN" ? (
          <input type="hidden" name="studentIdsJson" value={JSON.stringify(Array.from(selected))} />
        ) : (
          <input
            type="hidden"
            name="sunnahJson"
            value={JSON.stringify(
              Array.from(selected).map((k) => {
                const [studentId, section, level] = k.split("|");
                return { studentId, section, level: Number(level) };
              })
            )}
          />
        )}
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>تاريخ الدفعة</div>
          <DateField name="date" value={date} onChange={setDate} width={170} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{selected.size} مختار من {candidates.length}</div>
          <button
            type="button"
            onClick={() => setSelected(new Set(candidates.map((c) => c.key)))}
            style={{ ...softButtonStyle, marginInlineStart: "auto" }}
          >
            إضافة الكل
          </button>
          {selected.size > 0 && (
            <button type="button" onClick={() => setSelected(new Set())} style={{ ...softButtonStyle, background: "transparent" }}>
              إلغاء الكل
            </button>
          )}
        </div>

        {candidates.length === 0 ? (
          <div style={{ padding: "24px 16px", borderRadius: 12, border: "1px dashed var(--line)", background: "var(--card-2-grad)", textAlign: "center", fontSize: 13, color: "var(--ink-2)" }}>
            {kind === "QURAN"
              ? "لا يوجد طالب مؤهَّل الآن — كل من نجح في ترشيح الأوقاف إمّا خاض سبر الأوقاف الفعلي بعدها ولم يُرشَّح مجددًا."
              : "لا يوجد طالب ناجح في سبر ترشيح الأوقاف للسنّة النبوية بانتظار دفعة."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {candidates.map((c) => {
              const on = selected.has(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggle(c.key)}
                  style={{
                    textAlign: "start",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    padding: "10px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: on ? "1px solid var(--accent-line)" : "1px solid var(--line-2)",
                    background: on ? "var(--chip-strong)" : "var(--card-2-grad)",
                    color: "var(--ink)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>#{c.no}</span>
                    <span style={{ fontSize: 10.5, color: "var(--ink-3)", border: "1px solid var(--line)", borderRadius: 999, padding: "1px 8px" }}>
                      {c.tag}
                    </span>
                    <span style={{ marginInlineStart: "auto", fontSize: 11, color: "var(--ink-3)" }}>{on ? "✓ مختار" : ""}</span>
                  </div>
                  {c.note && <div style={{ fontSize: 11.5, color: kind === "QURAN" ? "var(--bad-ink)" : "var(--ink-3)" }}>{c.note}</div>}
                </button>
              );
            })}
          </div>
        )}

        {state.error && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--notice-line)",
              background: "var(--notice-soft)",
              fontSize: 13.5,
            }}
          >
            {state.error}
          </div>
        )}
        <button type="submit" disabled={pending || selected.size === 0} style={{ ...primaryButtonStyle, width: "100%", minHeight: 48 }}>
          فتح الدفعة ({selected.size})
        </button>
      </form>
    </Drawer>
  );
}

/** حذف الدفعة بتأكيد: تُحذف نتائج طلابها وشهاداتهم معها */
function DeleteBatch({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  // هل يُحذف طلاب الدفعة من قائمة المؤهلين لسبر الأوقاف؟ (لا اختيار افتراضي)
  const [remove, setRemove] = useState<boolean | null>(null);
  if (!confirm) {
    return (
      <button type="button" onClick={() => setConfirm(true)} style={{ alignSelf: "flex-start", padding: "5px 12px", borderRadius: 9, border: "1px solid var(--line)", background: "transparent", color: "var(--bad-ink, var(--bad))", fontSize: 12.5, cursor: "pointer" }}>
        حذف الدفعة
      </button>
    );
  }
  return (
    <div style={{ padding: "10px 12px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        حذف {label} نهائيًا؟ تُحذف علامات طلابها وشهاداتهم المسجّلة فيها. ترفيع طالب نجح فيها لا يُلغى.
      </div>
      <div style={{ fontWeight: 700 }}>هل تريد حذف الطلاب من قائمة المؤهلين لسبر الأوقاف؟</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setRemove(true)} style={{ ...chipStyle(remove === true), padding: "7px 14px" }}>
          نعم، احذفهم من القائمة
        </button>
        <button type="button" onClick={() => setRemove(false)} style={{ ...chipStyle(remove === false), padding: "7px 14px" }}>
          لا، يعودون إلى القائمة
        </button>
      </div>
      {error && <div style={{ color: "var(--bad)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={pending || remove === null}
          onClick={async () => {
            if (remove === null) return;
            setPending(true);
            setError("");
            const res = await deleteAwqafBatch(id, remove);
            setPending(false);
            if (res.error) setError(res.error);
            else router.refresh();
          }}
          style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: "var(--bad)", color: "#fff", fontSize: 13, cursor: "pointer", opacity: pending || remove === null ? 0.5 : 1 }}
        >
          {pending ? "جارٍ الحذف…" : "تأكيد الحذف"}
        </button>
        <button type="button" onClick={() => setConfirm(false)} style={{ ...softButtonStyle, padding: "7px 16px" }}>
          إلغاء
        </button>
      </div>
    </div>
  );
}
