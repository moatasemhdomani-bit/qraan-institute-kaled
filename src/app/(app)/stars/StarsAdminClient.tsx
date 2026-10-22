"use client";

import { useMemo, useState } from "react";
import { chipStyle, inputStyle, primaryButtonStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";
import type { StarTxnRow } from "@/lib/stars";
import Select from "@/components/Select";
import StarOpDrawer from "./StarOpDrawer";
import StarArchive from "./StarArchive";
import StarBadge from "./StarBadge";
import { adminHalqaStars, adminOfficerStars, adminStudentsStars } from "./actions";
import { textHas } from "@/lib/search";

type StudentRow = { id: string; name: string; no: number; stars: number; active: boolean; halqaId: string | null; halqaName: string | null };
type HalqaRow = { id: string; name: string; teacherName: string; cohortName: string; stars: number; studentIds: string[] };
type OfficerRow = { id: string; name: string; stars: number };

type Op = "halqa" | "officer" | "student" | null;

/**
 * «إدارة النجوم» عند الإدارة: ثلاثة أزرار — نجوم الحلقات، نجوم النشاط، نجوم الطلاب —
 * ثم فلاتر السجل (حلقة / طالب / مسؤول نشاط) ثم السجل نفسه.
 */
export default function StarsAdminClient({
  halaqat,
  students,
  officers,
  actors,
  archive,
  archiveLimit,
}: {
  halaqat: HalqaRow[];
  students: StudentRow[];
  officers: OfficerRow[];
  /** «الفاعل»: كل حسابات المستخدمين (الموظفين) — من أجرى العملية */
  actors: { id: string; name: string }[];
  archive: StarTxnRow[];
  archiveLimit: number;
}) {
  const [op, setOp] = useState<Op>(null);
  const [picked, setPicked] = useState<string[]>([]);
  // نجوم الطلاب: البحث، أو حلقة لعرض طلابها
  const [search, setSearch] = useState("");
  const [pickHalqa, setPickHalqa] = useState("");
  // فلاتر السجل
  const [fStudent, setFStudent] = useState("");
  const fStudentQ = toWesternDigits(fStudent.trim());
  const [fOfficer, setFOfficer] = useState("");
  const [fKind, setFKind] = useState("");

  const byId = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students]);

  // الحلقات مجمّعة حسب الفوج
  const cohorts = useMemo(() => {
    const m = new Map<string, HalqaRow[]>();
    for (const h of halaqat) m.set(h.cohortName, [...(m.get(h.cohortName) ?? []), h]);
    return [...m].sort((a, b) => a[0].localeCompare(b[0], "ar"));
  }, [halaqat]);

  const open = (o: Op) => {
    setPicked([]);
    setSearch("");
    setPickHalqa("");
    setOp(o);
  };
  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // نجوم الطلاب: نتائج البحث أو طلاب الحلقة المختارة
  const studentList = useMemo(() => {
    const q = toWesternDigits(search.trim());
    if (q) return students.filter((s) => textHas(s.name, q) || String(s.no) === q).slice(0, 30);
    if (pickHalqa) return (halaqat.find((h) => h.id === pickHalqa)?.studentIds ?? []).map((id) => byId[id]).filter(Boolean);
    return [];
  }, [students, search, pickHalqa, halaqat, byId]);

  // السجل بعد الفلاتر — بلا أعداد على الخيارات، و«عدد النتائج» في السجل
  const shown = useMemo(
    () =>
      archive.filter(
        (r) =>
          // الطالب يُكتب اسمه أو رقمه — فارغ = الكل
          (!fStudentQ || (!!r.studentName && (textHas(r.studentName, fStudentQ) || String(r.studentNo ?? "") === fStudentQ))) &&
          // الفاعل: من أجرى العملية
          (!fOfficer || r.byId === fOfficer) &&
          (!fKind || r.kind === fKind)
      ),
    [archive, fStudentQ, fOfficer, fKind]
  );

  const allHalaqat = halaqat.length > 0 && picked.length === halaqat.length;
  const allOfficers = officers.length > 0 && picked.length === officers.length;
  const one = op === "student" && picked.length === 1 ? byId[picked[0]] : null;

  const bigBtn = { ...primaryButtonStyle, padding: "14px 22px", fontSize: 15 } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => open("halqa")} style={bigBtn}>
          ★ نجوم الحلقات
        </button>
        <button type="button" onClick={() => open("officer")} style={bigBtn}>
          ★ نجوم النشاط
        </button>
        <button type="button" onClick={() => open("student")} style={bigBtn}>
          ★ نجوم الطلاب
        </button>
      </div>

      {/* فلاتر السجل */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>نوع العملية</div>
          <Select value={fKind} onChange={setFKind} width={150} options={[{ value: "", label: "الكل" }, { value: "CHARGE", label: "إيداع" }, { value: "WITHDRAW", label: "سحب" }]} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>الطالب</div>
          <input value={fStudent} onChange={(e) => setFStudent(e.target.value)} placeholder="كل الطلاب — اكتبوا الاسم أو الرقم" style={{ ...inputStyle(), width: 240 }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>الفاعل</div>
          <Select value={fOfficer} onChange={setFOfficer} width={220} options={[{ value: "", label: "الكل" }, ...actors.map((o) => ({ value: o.id, label: o.name }))]} />
        </div>
        {(fStudent || fOfficer || fKind) && (
          <button
            type="button"
            onClick={() => {
              setFStudent("");
              setFOfficer("");
              setFKind("");
            }}
            style={{ ...chipStyle(false), padding: "9px 14px" }}
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      <StarArchive rows={shown} limit={archiveLimit} kindFilter={false} />

      {/* نجوم الحلقات */}
      {op === "halqa" && (
        <StarOpDrawer
          title="نجوم الحلقات"
          subtitle="إيداع رصيد حلقة أو أكثر أو سحبه"
          canSubmit={picked.length > 0}
          onSubmit={(v) => adminHalqaStars({ halqaIds: picked, ...v })}
          onClose={() => setOp(null)}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1 }}>
                الحلقات {picked.length > 0 && `— المختارة: ${picked.length} من ${halaqat.length}`}
              </div>
              <button type="button" onClick={() => setPicked(allHalaqat ? [] : halaqat.map((h) => h.id))} style={{ ...chipStyle(allHalaqat), padding: "6px 14px" }}>
                {allHalaqat ? "✓ كل الحلقات" : "اختيار الكل"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cohorts.map(([cohortName, list]) => (
                <div key={cohortName}>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>فوج {cohortName}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {list.map((h) => (
                      <button key={h.id} type="button" onClick={() => toggle(h.id)} style={{ ...chipStyle(picked.includes(h.id)), padding: "8px 12px" }}>
                        {picked.includes(h.id) ? "✓ " : ""}
                        {h.name} <span style={{ opacity: 0.75 }}>★ {h.stars}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>
              {picked.length > 1 ? "يُودَع العدد نفسه لكل حلقة من الحلقات المختارة (أو يُسحب من كل منها)." : "رصيد الحلقة يصرفه مدرّسها على طلابها وحدهم."}
            </div>
          </div>
        </StarOpDrawer>
      )}

      {/* نجوم النشاط */}
      {op === "officer" && (
        <StarOpDrawer
          title="نجوم النشاط"
          subtitle="إيداع رصيد مسؤول نشاط أو أكثر أو سحبه"
          canSubmit={picked.length > 0}
          onSubmit={(v) => adminOfficerStars({ officerIds: picked, ...v })}
          onClose={() => setOp(null)}
        >
          <div>
            {officers.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد مسؤول نشاط بعد — يُضاف من «إدارة المستخدمين».</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1 }}>
                    مسؤولو النشاط {picked.length > 0 && `— المختارون: ${picked.length} من ${officers.length}`}
                  </div>
                  {officers.length > 1 && (
                    <button type="button" onClick={() => setPicked(allOfficers ? [] : officers.map((o) => o.id))} style={{ ...chipStyle(allOfficers), padding: "6px 14px" }}>
                      {allOfficers ? "✓ الكل" : "اختيار الكل"}
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {officers.map((o) => (
                    <button key={o.id} type="button" onClick={() => toggle(o.id)} style={{ ...chipStyle(picked.includes(o.id)), padding: "8px 12px" }}>
                      {picked.includes(o.id) ? "✓ " : ""}
                      {o.name} <span style={{ opacity: 0.75 }}>★ {o.stars}</span>
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>
                  رصيد النشاط يودع منه مسؤول النشاط للطلاب — وما يسحبه من الطلاب مقابل النشاط لا يعود إليه.
                </div>
              </>
            )}
          </div>
        </StarOpDrawer>
      )}

      {/* نجوم الطلاب */}
      {op === "student" && (
        <StarOpDrawer
          title="نجوم الطلاب"
          subtitle="إيداع طالب أو أكثر أو سحب نجومهم — لا يمسّ رصيد الحلقة"
          canSubmit={picked.length > 0}
          balance={one ? one.stars : picked.length > 0 ? Math.min(...picked.map((id) => byId[id]?.stars ?? 0)) : undefined}
          onSubmit={(v) => adminStudentsStars({ studentIds: picked, ...v })}
          onClose={() => setOp(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {picked.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {picked.map((id) => (
                  <button key={id} type="button" onClick={() => toggle(id)} style={{ ...chipStyle(true), padding: "6px 10px" }} title="إزالة">
                    ✕ {byId[id]?.name} <StarBadge n={byId[id]?.stars ?? 0} />
                  </button>
                ))}
              </div>
            )}
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحثوا باسم الطالب أو رقمه" style={inputStyle()} />
            <Select
              value={pickHalqa}
              onChange={(v) => {
                setPickHalqa(v);
                setSearch("");
              }}
              options={[{ value: "", label: "أو اختاروا حلقة لعرض طلابها" }, ...halaqat.map((h) => ({ value: h.id, label: h.name }))]}
            />
            {pickHalqa && !search.trim() && studentList.length > 0 && (
              <button
                type="button"
                onClick={() => setPicked((prev) => [...new Set([...prev, ...studentList.map((s) => s.id)])])}
                style={{ ...chipStyle(false), alignSelf: "flex-start", padding: "6px 14px" }}
              >
                اختيار كل طلاب الحلقة
              </button>
            )}
            {(search.trim() || pickHalqa) && studentList.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد طالب.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflow: "auto" }}>
              {studentList.map((s) => {
                const on = picked.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: `1px solid ${on ? "var(--gold)" : "var(--line)"}`, background: "var(--card-2-grad)", color: "var(--ink)", textAlign: "start", cursor: "pointer" }}
                  >
                    <span style={{ width: 18 }}>{on ? "✓" : ""}</span>
                    <span style={{ flex: 1, fontSize: 14 }}>
                      {s.name} <span style={{ fontSize: 12, color: "var(--ink-3)" }}>#{s.no}</span>
                      {!s.active && <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}> · منقطع</span>}
                      <span style={{ display: "block", fontSize: 12, color: "var(--ink-2)" }}>{s.halqaName ?? "غير مفروز"}</span>
                    </span>
                    <StarBadge n={s.stars} />
                  </button>
                );
              })}
            </div>
            {picked.length > 1 && <div style={{ fontSize: 12, color: "var(--ink-3)" }}>يُودَع العدد نفسه لكل طالب مختار (أو يُسحب من كل منهم).</div>}
          </div>
        </StarOpDrawer>
      )}
    </div>
  );
}
