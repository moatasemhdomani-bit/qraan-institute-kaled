"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/Select";
import DateField from "@/components/DateField";

type Row = {
  id: string;
  name: string;
  no: number;
  photoUrl: string | null;
  halqaId: string;
  halqaName: string;
  cohortName: string;
  teacherName: string;
  times: number;
  hadiths: number;
  repeats: number;
  last: string;
};

const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "ar"));

export default function HadithMonitorClient({ rows, from, to, basePath }: { rows: Row[]; from: string; to: string; basePath: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [cohort, setCohort] = useState("all");
  const [teacher, setTeacher] = useState("all");
  const [halqa, setHalqa] = useState("all");

  const go = (f: string, t: string) => router.push(`${basePath}?from=${f}&to=${t}`);

  const inCohort = (r: Row) => cohort === "all" || r.cohortName === cohort;
  const inTeacher = (r: Row) => teacher === "all" || r.teacherName === teacher;
  const inHalqa = (r: Row) => halqa === "all" || r.halqaId === halqa;
  const inStatus = (r: Row) => status === "all" || (status === "done" ? r.times > 0 : r.times === 0);

  const cohortOptions = [{ value: "all", label: "كل الأفواج" }, ...uniq(rows.map((r) => r.cohortName)).map((n) => ({ value: n, label: n === "—" ? "بلا فوج" : `فوج ${n}` }))];
  const teacherOptions = [{ value: "all", label: "كل المدرّسين" }, ...uniq(rows.filter(inCohort).map((r) => r.teacherName)).map((n) => ({ value: n, label: n === "—" ? "بلا مدرّس" : n }))];
  const halqaMap = new Map(rows.filter((r) => inCohort(r) && inTeacher(r)).map((r) => [r.halqaId, r.halqaName]));
  const halqaOptions = [
    { value: "all", label: "كل الحلقات" },
    ...[...halqaMap.entries()].sort((a, b) => a[1].localeCompare(b[1], "ar")).map(([id, name]) => ({ value: id, label: name })),
  ];

  const shown = rows.filter((r) => inCohort(r) && inTeacher(r) && inHalqa(r) && inStatus(r));
  const doneCount = shown.filter((r) => r.times > 0).length;

  const th: React.CSSProperties = { padding: "9px 10px", fontSize: 12.5, fontWeight: 700, color: "var(--ink-2)", textAlign: "start", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13, borderBottom: "1px solid var(--line)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          padding: "12px 14px",
          borderRadius: 13,
          border: "1px solid var(--line)",
          background: "var(--card-2-grad)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>من تاريخ</span>
          <DateField defaultValue={from} onChange={(v) => v && go(v, to)} />
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>إلى تاريخ</span>
          <DateField defaultValue={to} onChange={(v) => v && go(from, v)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, flex: "1 1 460px" }}>
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "الحالة: الكل" },
              { value: "done", label: "سمّع" },
              { value: "none", label: "لم يسمّع" },
            ]}
          />
          <Select
            value={cohort}
            onChange={(v) => {
              setCohort(v);
              setTeacher("all");
              setHalqa("all");
            }}
            options={cohortOptions}
          />
          <Select
            value={teacher}
            onChange={(v) => {
              setTeacher(v);
              setHalqa("all");
            }}
            options={teacherOptions}
          />
          <Select value={halqa} onChange={setHalqa} options={halqaOptions} />
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
        عدد النتائج: {shown.length} طالبًا — سمّع {doneCount}، لم يسمّع {shown.length - doneCount}
      </div>

      {shown.length === 0 ? (
        <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--ink-2)" }}>لا طلاب مطابقون للفلترة.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 13, background: "var(--card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 42 }}>م</th>
                <th style={th}>الطالب</th>
                <th style={th}>الحلقة</th>
                <th style={th}>المدرّس</th>
                <th style={th}>الفوج</th>
                <th style={th}>الحالة</th>
                <th style={th}>أحاديث ناجحة</th>
                <th style={th}>إعادة</th>
                <th style={th}>آخر تسميع</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.id}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                      <span
                        style={{
                          width: 38,
                          height: 38,
                          flexShrink: 0,
                          borderRadius: "50%",
                          background: "var(--chip)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          color: "var(--ink-2)",
                          overflow: "hidden",
                        }}
                      >
                        {r.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          r.name.charAt(0)
                        )}
                      </span>
                      <span>
                        {r.name} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>#{r.no}</span>
                      </span>
                    </span>
                  </td>
                  <td style={td}>{r.halqaName}</td>
                  <td style={td}>{r.teacherName}</td>
                  <td style={td}>{r.cohortName}</td>
                  <td style={{ ...td, fontWeight: 700, color: r.times > 0 ? "var(--ok)" : "var(--bad)" }}>{r.times > 0 ? "سمّع" : "لم يسمّع"}</td>
                  <td style={td}>{r.times > 0 ? r.hadiths : "—"}</td>
                  <td style={td}>{r.times > 0 ? r.repeats : "—"}</td>
                  <td style={td}>{r.last ? r.last.replace(/-/g, "/") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
