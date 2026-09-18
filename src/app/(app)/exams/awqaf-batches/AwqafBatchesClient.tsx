"use client";

import { useState, useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cardStyle, inputStyle, primaryButtonStyle, softButtonStyle } from "@/lib/ui";
import Drawer from "@/components/Drawer";
import { createAwqafBatch, type FormState } from "./actions";

type Candidate = { id: string; no: number; name: string; nominationDate: string; nominationPresent: boolean; priorFailNote: string | null };
type Batch = {
  id: string;
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

function todayStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function batchBadge(b: Batch) {
  if (!b.allScored) return { label: "بانتظار العلامات", color: "#D4AF37" };
  if (b.passedCount === 0) return { label: "لا ناجحين في هذه الدفعة", color: "var(--ink-3)" };
  if (b.deliveredCount === b.passedCount) return { label: "دورة الشهادة مكتملة", color: "#6FBF8B" };
  return { label: "دورة الشهادة جارية", color: "#8FA8C8" };
}

export default function AwqafBatchesClient({
  candidates,
  batches,
  searchStudents,
}: {
  candidates: Candidate[];
  batches: Batch[];
  searchStudents: SearchStudent[];
}) {
  const router = useRouter();
  const [newBatchOpen, setNewBatchOpen] = useState(false);
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
        <button onClick={() => setNewBatchOpen(true)} style={{ ...primaryButtonStyle, alignSelf: "flex-start" }}>
          دفعة جديدة
        </button>
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
            <Link
              key={b.id}
              href={`/exams/awqaf-batches/${b.id}`}
              style={{ ...cardStyle, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, textDecoration: "none", color: "var(--ink)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15.5, fontWeight: 700, direction: "ltr" }}>دفعة {b.date}</span>
                <span
                  style={{
                    marginInlineStart: "auto",
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    border: `1px solid ${badge.color}66`,
                    color: badge.color,
                    background: `${badge.color}1A`,
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
          );
        })
      )}

      {newBatchOpen && (
        <NewBatchDrawer
          candidates={candidates}
          onClose={() => setNewBatchOpen(false)}
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
                          color: h.passed ? "#6FBF8B" : "#E08A8A",
                        }}
                      >
                        {h.passed ? "ناجح" : "راسب"}
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

function NewBatchDrawer({
  candidates,
  onClose,
  onCreated,
}: {
  candidates: Candidate[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [date, setDate] = useState(todayStr());
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
    <Drawer open onClose={onClose} title="دفعة سبر أوقاف جديدة" subtitle={`${candidates.length} طالبًا مؤهَّلًا`}>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="studentIdsJson" value={JSON.stringify(Array.from(selected))} />
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>تاريخ الدفعة</div>
          <input name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle(), width: "100%" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{selected.size} مختار من {candidates.length}</div>
          <button
            type="button"
            onClick={() => setSelected(new Set(candidates.map((c) => c.id)))}
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
            لا يوجد طالب مؤهَّل الآن — كل من نجح في ترشيح الأوقاف إمّا خاض سبر الأوقاف الفعلي بعدها ولم يُرشَّح مجددًا.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {candidates.map((c) => {
              const on = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
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
                      {c.nominationPresent ? "حاضرًا" : "غيبًا"}
                    </span>
                    <span style={{ marginInlineStart: "auto", fontSize: 11, color: "var(--ink-3)" }}>{on ? "✓ مختار" : ""}</span>
                  </div>
                  {c.priorFailNote && <div style={{ fontSize: 11.5, color: "#E0B4B4" }}>{c.priorFailNote}</div>}
                </button>
              );
            })}
          </div>
        )}

        {state.error && <div style={{ fontSize: 12.5, color: "#E08A8A" }}>{state.error}</div>}
        <button type="submit" disabled={pending || selected.size === 0} style={{ ...primaryButtonStyle, width: "100%", minHeight: 48 }}>
          فتح الدفعة ({selected.size})
        </button>
      </form>
    </Drawer>
  );
}
