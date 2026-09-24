"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cardStyle, chipStyle, inputStyle } from "@/lib/ui";
import { deleteIssuedReport, renameIssuedReport, type FormState } from "./actions";

type IssuedRow = {
  id: string;
  kind: string;
  kindLabel: string;
  name: string;
  range: string;
  at: string;
  by: string;
};

// «مراجعة التقرير» يعيد فتح شاشة إعداد التقرير بنفس المدخلات المحفوظة — لا يُخزَّن محتوى التقرير نفسه
const REVIEW_PATHS: Record<string, string> = {
  HALAQAT: "/reports/halaqat",
  TEACHERS: "/reports/teachers",
  STUDENT: "/reports/student",
};

const FILTERS = [
  { id: "all", label: "كل الأنواع" },
  { id: "HALAQAT", label: "تسميع الحلقات" },
  { id: "TEACHERS", label: "الشهري للمدرسين" },
  { id: "STUDENT", label: "تقرير طالب" },
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
        style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid var(--notice-line)", background: "transparent", color: "#E08A8A", fontSize: 12.5, cursor: "pointer" }}
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
      {state.error && <span style={{ fontSize: 11.5, color: "#E08A8A" }}>{state.error}</span>}
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
      {state.error && <span style={{ fontSize: 11.5, color: "#E08A8A" }}>{state.error}</span>}
    </form>
  );
}

export default function ReportsHubClient({ issued, isDirector }: { issued: IssuedRow[]; isDirector: boolean }) {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => issued.filter((r) => filter === "all" || r.kind === filter), [issued, filter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>سجل التقارير الصادرة</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={chipStyle(filter === f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--ink-2)", ...cardStyle }}>لا تقارير صادرة بهذا النوع بعد.</div>
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
