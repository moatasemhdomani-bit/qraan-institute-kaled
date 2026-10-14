"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cardStyle, inputStyle } from "@/lib/ui";
import Select from "@/components/Select";
import DateField from "@/components/DateField";
import { deleteIssuedReport, renameIssuedReport, type FormState } from "./actions";

type IssuedRow = {
  id: string;
  kind: string;
  kindLabel: string;
  name: string;
  range: string;
  at: string;
  /** YYYY-MM-DD */
  day: string;
  by: string;
};

// «مراجعة التقرير» يعيد فتح شاشة إعداد التقرير بنفس المدخلات المحفوظة — لا يُخزَّن محتوى التقرير نفسه
const REVIEW_PATHS: Record<string, string> = {
  HALAQAT: "/reports/halaqat",
  TEACHERS: "/reports/teachers",
  HALAQAT_AR: "/reports/halaqat-arabic",
  TEACHERS_AR: "/reports/teachers-arabic",
  STUDENT: "/reports/student",
  AWQAF_MARKS: "/reports/awqaf-marks",
  ORPHANS: "/reports/orphans",
};

const FILTERS = [
  { id: "all", label: "كل أنواع التقارير" },
  { id: "HALAQAT", label: "تسميع حلقات القرآن" },
  { id: "TEACHERS", label: "الشهري لمدرسي القرآن" },
  { id: "HALAQAT_AR", label: "تسميع حلقات القراءة العربية" },
  { id: "TEACHERS_AR", label: "الشهري لمدرسي القراءة العربية" },
  { id: "STUDENT", label: "تقرير طالب" },
  { id: "AWQAF_MARKS", label: "علامات سبر الأوقاف" },
  { id: "ORPHANS", label: "الأيتام" },
];

function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(deleteIssuedReport, {});
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid var(--notice-line)", background: "transparent", color: "var(--bad)", fontSize: 12.5, cursor: "pointer" }}
      >
        حذف
      </button>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="hidden" name="id" value={id} />
      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>تأكيد الحذف؟</span>
      <button type="submit" disabled={pending} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}>
        {pending ? "…" : "نعم، احذف"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 12, cursor: "pointer" }}>
        تراجع
      </button>
      {state.error && <span style={{ fontSize: 11.5, color: "var(--bad)" }}>{state.error}</span>}
    </form>
  );
}

function RenameControl({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(renameIssuedReport, {});
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  useEffect(() => {
    if (state.ok) {
      setEditing(false);
      router.refresh();
    }
  }, [state.ok, router]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12.5, cursor: "pointer" }}
      >
        تعديل الاسم
      </button>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="hidden" name="id" value={id} />
      <input name="name" value={value} onChange={(e) => setValue(e.target.value)} style={{ ...inputStyle(), minWidth: 160 }} />
      <button type="submit" disabled={pending} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}>
        {pending ? "…" : "حفظ"}
      </button>
      <button type="button" onClick={() => setEditing(false)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 12, cursor: "pointer" }}>
        تراجع
      </button>
      {state.error && <span style={{ fontSize: 11.5, color: "var(--bad)" }}>{state.error}</span>}
    </form>
  );
}

export default function ReportsHubClient({ issued, isDirector }: { issued: IssuedRow[]; isDirector: boolean }) {
  const [filter, setFilter] = useState("all");
  const [by, setBy] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const staffOptions = useMemo(
    () => [{ value: "all", label: "كل الموظفين" }, ...[...new Set(issued.map((r) => r.by))].sort((a, b) => a.localeCompare(b, "ar")).map((n) => ({ value: n, label: n }))],
    [issued]
  );
  const filtered = useMemo(
    () =>
      issued.filter(
        (r) => (filter === "all" || r.kind === filter) && (by === "all" || r.by === by) && (!from || r.day >= from) && (!to || r.day <= to)
      ),
    [issued, filter, by, from, to]
  );
  const anyFilter = filter !== "all" || by !== "all" || from || to;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>سجل التقارير الصادرة</div>
      <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
          <Select value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f.id, label: f.label }))} />
          <Select value={by} onChange={setBy} options={staffOptions} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <DateField label="من تاريخ" value={from} onChange={setFrom} width={160} />
          <DateField label="إلى تاريخ" value={to} onChange={setTo} width={160} />
          {anyFilter && (
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setBy("all");
                setFrom("");
                setTo("");
              }}
              style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>عدد النتائج: {filtered.length}</div>
      {filtered.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--ink-2)", ...cardStyle }}>لا تقارير صادرة مطابقة للفلاتر.</div>
      ) : (
        filtered.map((r) => (
          <div key={r.id} style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 3 }}>
                {r.kindLabel} · {r.range} · أصدره {r.by} بتاريخ {r.at}
              </div>
            </div>
            <Link
              href={`${REVIEW_PATHS[r.kind] ?? "/reports"}?review=${r.id}`}
              style={{ padding: "8px 16px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12.5, textDecoration: "none" }}
            >
              مراجعة التقرير
            </Link>
            {isDirector && (
              <>
                <RenameControl id={r.id} name={r.name} />
                <DeleteButton id={r.id} />
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
