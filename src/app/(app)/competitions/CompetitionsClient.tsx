"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cardStyle, inputStyle, primaryButtonStyle, softButtonStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";
import { textHas } from "@/lib/search";
import { STATUS_LABELS, WINS_TO_ADVANCE, LOSSES_TO_EXIT, type EntryState } from "@/lib/competition";
import Drawer from "@/components/Drawer";
import NumberField from "@/components/NumberField";
import StarBadge from "../stars/StarBadge";
import { createCompetition, joinCompetition, recordMatch, undoLastMatch, type CompResult } from "./actions";

type Entry = EntryState & {
  no: number;
  studentId: string;
  name: string;
  studentNo: number;
  cohortName: string;
  teacherName: string;
  attempt: number;
};
type Competition = { id: string; name: string; cost: number; levels: number; matchSize: number; canUndo: boolean; entries: Entry[] };
type StudentRow = { id: string; name: string; no: number; stars: number; halqaName: string | null };

const STATUS_COLORS = { ACTIVE: "var(--ink-2)", OUT: "var(--bad)", WON: "var(--ok)" } as const;

export default function CompetitionsClient({ competitions, students }: { competitions: Competition[]; students: StudentRow[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const open = competitions.find((c) => c.id === openId) ?? null;

  // كل عملية: رسالة نجاح أو خطأ ثم تحديث البيانات
  const run = (fn: () => Promise<CompResult>, okText: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.error) setNotice({ ok: false, text: res.error });
      else {
        setNotice({ ok: true, text: okText });
        after?.();
        router.refresh();
      }
    });

  const noticeBox = notice && (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 12,
        fontSize: 13.5,
        border: notice.ok ? "1px solid rgba(111,191,139,0.5)" : "1px solid var(--notice-line)",
        background: notice.ok ? "linear-gradient(135deg, rgba(111,191,139,0.16), rgba(111,191,139,0.03))" : "var(--notice-soft)",
      }}
    >
      <span style={{ flex: 1 }}>{notice.text}</span>
      <button type="button" onClick={() => setNotice(null)} style={{ border: 0, background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontSize: 16 }}>
        ×
      </button>
    </div>
  );

  if (open) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <button type="button" onClick={() => { setOpenId(null); setNotice(null); }} style={{ alignSelf: "flex-start", border: 0, background: "transparent", color: "var(--ink-2)", fontSize: 13, cursor: "pointer", padding: 0 }}>
          ← رجوع إلى المسابقات
        </button>
        <div style={{ ...cardStyle, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{open.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span>
                المشاركة: <StarBadge n={open.cost} />
              </span>
              <span>{open.levels} مستويات</span>
              <span>{open.matchSize} طلاب في المباراة</span>
              <span>{open.entries.filter((e) => e.status === "ACTIVE").length} مستمر من {open.entries.length}</span>
            </div>
          </div>
          <button type="button" onClick={() => setAdding(true)} style={primaryButtonStyle}>
            إضافة طالب
          </button>
        </div>
        {noticeBox}
        <MatchForm comp={open} pending={pending} onRecord={(w, l) => run(() => recordMatch(open.id, w, l), `سُجّلت المباراة: فاز ${w.join("، ")} على ${l.join("، ")}.`)} onUndo={() => run(() => undoLastMatch(open.id), "أُلغيت آخر مباراة.")} />
        <EntriesTable comp={open} />
        {adding && (
          <AddStudentDrawer
            comp={open}
            students={students}
            pending={pending}
            onPick={(s) => run(() => joinCompetition(open.id, s.id), `انضمّ ${s.name} إلى المسابقة وسُحبت ${open.cost} نجمة من رصيده.`, () => setAdding(false))}
            onClose={() => setAdding(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setAdding(true)} style={primaryButtonStyle}>
          إضافة مسابقة
        </button>
      </div>
      {noticeBox}
      {competitions.length === 0 ? (
        <div style={{ padding: "44px 22px", borderRadius: 16, border: "1px dashed var(--line)", background: "var(--card-grad)", textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>لا مسابقات بعد</div>
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>أضيفوا مسابقة باسمها وعدد نجوم المشاركة وعدد مستوياتها.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          {competitions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setOpenId(c.id); setNotice(null); }}
              style={{ ...cardStyle, padding: 18, textAlign: "start", color: "var(--ink)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <span>
                  المشاركة: <StarBadge n={c.cost} />
                </span>
                <span>{c.levels} مستويات</span>
                <span>{c.matchSize} في المباراة</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                {c.entries.length} مشاركة · {c.entries.filter((e) => e.status === "ACTIVE").length} مستمر
              </div>
            </button>
          ))}
        </div>
      )}
      {adding && <NewCompetitionDrawer pending={pending} onSubmit={(v) => run(() => createCompetition(v), `أُضيفت مسابقة «${v.name.trim()}».`, () => setAdding(false))} onClose={() => setAdding(false)} />}
    </div>
  );
}

function NewCompetitionDrawer({ pending, onSubmit, onClose }: { pending: boolean; onSubmit: (v: { name: string; cost: number; levels: number; matchSize: number }) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [levels, setLevels] = useState("");
  const [matchSize, setMatchSize] = useState("2");
  const odd = matchSize !== "" && Number(matchSize) % 2 !== 0;
  const label = { display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 } as const;
  return (
    <Drawer
      open
      title="إضافة مسابقة"
      subtitle="الاسم، ونجوم المشاركة تُسحب من رصيد الطالب عند ضمّه، وعدد المستويات، وعدد الطلاب في المباراة"
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={pending}
          onClick={() => onSubmit({ name, cost: Number(cost), levels: Number(levels), matchSize: Number(matchSize) })}
          style={{ ...primaryButtonStyle, width: "100%", opacity: pending ? 0.7 : 1 }}
        >
          {pending ? "جارٍ الحفظ…" : "حفظ المسابقة"}
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={label}>اسم المسابقة</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} autoFocus />
        </div>
        <div>
          <label style={label}>عدد النجوم للمشاركة</label>
          <NumberField value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div>
          <label style={label}>عدد المستويات</label>
          <NumberField value={levels} onChange={(e) => setLevels(e.target.value)} />
        </div>
        <div>
          <label style={label}>عدد الطلاب في المباراة</label>
          <NumberField value={matchSize} onChange={(e) => setMatchSize(e.target.value)} />
          <div style={{ fontSize: 12, color: odd ? "var(--bad)" : "var(--ink-3)", marginTop: 5 }}>
            {odd ? "يقبل الأعداد الزوجية فقط." : "عدد زوجي: نصفهم فائزون ونصفهم خاسرون — 4 = فائزان وخاسران."}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

/** البحث عن طالب نشط وضمّه — يظهر هل يستطيع المشاركة (نجومه، ومشاركاته السابقة) */
function AddStudentDrawer({ comp, students, pending, onPick, onClose }: { comp: Competition; students: StudentRow[]; pending: boolean; onPick: (s: StudentRow) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const matches = useMemo(() => {
    const q = toWesternDigits(search.trim());
    if (!q) return [];
    return students.filter((s) => textHas(s.name, q) || String(s.no) === q).slice(0, 20);
  }, [students, search]);

  const blockOf = (s: StudentRow): string | null => {
    const mine = comp.entries.filter((e) => e.studentId === s.id);
    if (mine.some((e) => e.status === "ACTIVE")) return "مشارك الآن";
    if (mine.some((e) => e.status === "WON")) return "فاز بالمسابقة";
    if (mine.length >= 2) return "شارك مرتين";
    if (s.stars < comp.cost) return "نجومه لا تكفي";
    return null;
  };

  return (
    <Drawer open title="إضافة طالب" subtitle={`${comp.name} — تُسحب ${comp.cost} نجمة من رصيده`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اكتبوا اسم الطالب أو رقمه — كل طلاب المعهد" style={inputStyle()} autoFocus />
        {search.trim() && matches.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد طالب نشط بهذا الاسم أو الرقم.</div>}
        {matches.map((s) => {
          const block = blockOf(s);
          const second = comp.entries.some((e) => e.studentId === s.id);
          return (
            <button
              key={s.id}
              type="button"
              disabled={!!block || pending}
              onClick={() => onPick(s)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                padding: "10px 12px",
                borderRadius: 11,
                border: "1px solid var(--line)",
                background: "var(--card-2-grad)",
                color: "var(--ink)",
                textAlign: "start",
                cursor: block ? "not-allowed" : "pointer",
                opacity: block ? 0.55 : 1,
                width: "100%",
              }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                  {s.name} <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>#{s.no}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                  {s.halqaName ?? "غير مفروز"}
                  {block ? ` — ${block}` : second ? " — المشاركة الثانية" : ""}
                </div>
              </div>
              <StarBadge n={s.stars} />
            </button>
          );
        })}
      </div>
    </Drawer>
  );
}

/** تسجيل مباراة باختيار المشاركين بأسمائهم (ويُحفظ رقم كل منهم كما في ورقة الدوري): نصف طلاب المباراة فائزون ونصفهم خاسرون */
function MatchForm({ comp, pending, onRecord, onUndo }: { comp: Competition; pending: boolean; onRecord: (winners: number[], losers: number[]) => void; onUndo: () => void }) {
  const half = comp.matchSize / 2;
  const empty = () => Array.from({ length: half }, () => "");
  const [winners, setWinners] = useState<string[]>(empty);
  const [losers, setLosers] = useState<string[]>(empty);
  const ready = [...winners, ...losers].every((v) => v !== "");
  // المستمرّون وحدهم يدخلون مباراة، ولا يُختار الطالب مرتين في المباراة نفسها
  const taken = new Set([...winners, ...losers].filter(Boolean));
  const field = (list: string[], set: (v: string[]) => void, i: number) => (
    <ParticipantPicker
      key={i}
      entries={comp.entries.filter((e) => e.status === "ACTIVE" && (!taken.has(String(e.no)) || String(e.no) === list[i]))}
      value={list[i]}
      onChange={(v) => set(list.map((x, j) => (j === i ? v : x)))}
    />
  );
  const group = (title: string, color: string, list: string[], set: (v: string[]) => void) => (
    <div>
      <div style={{ fontSize: 12.5, color, marginBottom: 6, fontWeight: 600 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{list.map((_, i) => field(list, set, i))}</div>
    </div>
  );
  return (
    <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>تسجيل مباراة</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {group(half === 1 ? "الفائز" : `الفائزون (${half})`, "var(--ok)", winners, setWinners)}
        {group(half === 1 ? "الخاسر" : `الخاسرون (${half})`, "var(--bad)", losers, setLosers)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={pending || !ready}
          onClick={() => {
            onRecord(winners.map(Number), losers.map(Number));
            setWinners(empty());
            setLosers(empty());
          }}
          style={{ ...primaryButtonStyle, opacity: pending || !ready ? 0.6 : 1 }}
        >
          تسجيل
        </button>
        {comp.canUndo && (
          <button type="button" disabled={pending} onClick={onUndo} style={{ ...softButtonStyle, padding: "8px 12px", fontSize: 12.5 }}>
            تراجع عن آخر مباراة
          </button>
        )}
      </div>
    </div>
  );
}

/** اختيار مشارك بكتابة اسمه أو رقمه: تظهر المطابقة من المستمرّين في المسابقة ويُختار واحد منهم */
function ParticipantPicker({ entries, value, onChange }: { entries: Entry[]; value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const picked = entries.find((e) => String(e.no) === value);
  const query = toWesternDigits(q.trim());
  const matches = query ? entries.filter((e) => textHas(e.name, query) || String(e.no) === query || String(e.studentNo) === query).slice(0, 8) : [];

  if (picked) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
        <span style={{ fontWeight: 800, minWidth: 22 }}>{picked.no}</span>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{picked.name}</span>
        <button type="button" onClick={() => onChange("")} aria-label="إلغاء الاختيار" style={{ border: 0, background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontSize: 16 }}>
          ×
        </button>
      </div>
    );
  }
  return (
    <div style={{ position: "relative" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        placeholder="اكتبوا اسم الطالب أو رقمه"
        style={inputStyle()}
      />
      {focus && query && (
        <div style={{ position: "absolute", top: "100%", insetInlineStart: 0, insetInlineEnd: 0, marginTop: 4, zIndex: 30, borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-grad), var(--panel-solid)", boxShadow: "var(--glow)", overflow: "hidden" }}>
          {matches.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--ink-3)" }}>لا مشارك مستمرّ بهذا الاسم.</div>
          ) : (
            matches.map((e) => (
              <button
                key={e.no}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => {
                  onChange(String(e.no));
                  setQ("");
                }}
                style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", padding: "9px 12px", border: 0, borderTop: "1px solid var(--line-2)", background: "transparent", color: "var(--ink)", textAlign: "start", cursor: "pointer", fontFamily: "inherit" }}
              >
                <span style={{ fontWeight: 800, minWidth: 22 }}>{e.no}</span>
                <span style={{ flex: 1, fontSize: 13.5 }}>{e.name}</span>
                <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>المستوى {e.level}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** جدول الدوري: سطر لكل مشاركة، وخاناتها «ف رقم» / «خ رقم» بالترتيب، و«تأهل» عند الانتقال إلى مستوى */
function EntriesTable({ comp }: { comp: Competition }) {
  if (comp.entries.length === 0) {
    return <div style={{ ...cardStyle, padding: 30, textAlign: "center", color: "var(--ink-2)" }}>لا مشاركون بعد — اضغطوا «إضافة طالب».</div>;
  }
  const th = { padding: "9px 8px", fontWeight: 600, whiteSpace: "nowrap" as const };
  const td = { padding: "8px", borderTop: "1px solid var(--line-2)", verticalAlign: "middle" as const };
  return (
    <div style={{ ...cardStyle, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
        <thead>
          <tr style={{ background: "var(--head-grad)", color: "var(--ink-2)", fontSize: 12 }}>
            <th style={th}>الرقم</th>
            <th style={{ ...th, textAlign: "start" }}>اسم الطالب</th>
            <th style={th}>الفوج</th>
            <th style={th}>المدرس</th>
            <th style={th}>المستوى</th>
            <th style={{ ...th, textAlign: "start" }}>المباريات</th>
            <th style={th}>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {comp.entries.map((e) => (
            <tr key={e.no} style={{ opacity: e.status === "OUT" ? 0.6 : 1 }}>
              <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{e.no}</td>
              <td style={{ ...td, fontWeight: 600 }}>
                {e.name}
                {e.attempt === 2 && <span style={{ marginInlineStart: 6, fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}>(المرة الثانية)</span>}
              </td>
              <td style={{ ...td, textAlign: "center", color: "var(--ink-2)" }}>{e.cohortName}</td>
              <td style={{ ...td, textAlign: "center", color: "var(--ink-2)" }}>{e.teacherName}</td>
              <td style={{ ...td, textAlign: "center" }}>
                {e.level} / {comp.levels}
              </td>
              <td style={td}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  {e.cells.map((c, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: 7,
                          fontSize: 12,
                          fontWeight: 700,
                          color: c.won ? "var(--ok)" : "var(--bad)",
                          border: `1px solid color-mix(in srgb, ${c.won ? "var(--ok)" : "var(--bad)"} 45%, transparent)`,
                        }}
                      >
                        {c.won ? "ف" : "خ"} {c.opponents ?? c.opponentNo ?? ""}
                      </span>
                      {c.qualified && <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--gold)" }}>تأهل</span>}
                    </span>
                  ))}
                  {e.status === "OUT" && <span style={{ fontSize: 15, fontWeight: 800, color: "var(--bad)" }}>✕</span>}
                </div>
                {e.status === "ACTIVE" && (
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                    في هذا المستوى: {e.wins}/{WINS_TO_ADVANCE} ربح · {e.losses}/{LOSSES_TO_EXIT} خسارة
                  </div>
                )}
              </td>
              <td style={{ ...td, textAlign: "center", fontWeight: 700, color: STATUS_COLORS[e.status] }}>{STATUS_LABELS[e.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
