"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cardStyle, chipStyle, inputStyle, primaryButtonStyle, ROLE_LABELS } from "@/lib/ui";
import Select from "@/components/Select";
import { sendAnnouncement, deleteAnnouncement } from "./actions";
import { textHas } from "@/lib/search";
import { toWesternDigits } from "@/lib/numbers";

/** مستلم الإعلان الموجّه: موظف، أو ولي أمر طالب */
type Person = { id: string; label: string; meta: string; guardian: boolean };

type Sent = { id: string; title: string; body: string; audienceLabel: string; recipients: number; read: number; by: string; at: string };

const ROLE_AUDIENCES = ["TEACHER", "GUARDIAN", "ADMIN", "EXAMINER", "EXAM_SUPERVISOR", "SUNNAH_EXAMINER", "ACTIVITY_OFFICER"];

export default function AnnouncementsClient({ cohorts, people, sent }: { cohorts: { id: string; name: string }[]; people: Person[]; sent: Sent[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [who, setWho] = useState<"all" | "staff" | "guardian">("all");
  const matches = (() => {
    const t = toWesternDigits(q.trim());
    if (!t) return [];
    return people
      .filter((p) => !picked.includes(p.id) && (who === "all" || (who === "guardian") === p.guardian) && (textHas(p.label, t) || p.meta.includes(t)))
      .slice(0, 12);
  })();
  const personOf = (id: string) => people.find((p) => p.id === id);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"all" | "role" | "cohort" | "user">("all");
  // دور أو أكثر
  const [roles, setRoles] = useState<string[]>(["TEACHER"]);
  const toggleRole = (r: string) => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? "");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const audience = kind === "all" ? "all" : kind === "role" ? `role:${roles.join(",")}` : kind === "user" ? `user:${picked.join(",")}` : `cohort:${cohortId}`;
  const label = { display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 } as const;

  const send = () =>
    start(async () => {
      const res = await sendAnnouncement({ title, body, audience });
      if (res.error) return setNotice({ ok: false, text: res.error });
      setNotice({ ok: true, text: `أُرسل الإعلان — عدد المستلمين: ${res.recipients}.` });
      setTitle("");
      setBody("");
      setPicked([]);
      router.refresh();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...cardStyle, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>إعلان جديد</div>
        <div>
          <label style={label}>العنوان</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle()} placeholder="مثلاً: عطلة يوم الخميس" />
        </div>
        <div>
          <label style={label}>النص</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} style={{ ...inputStyle(), resize: "vertical", lineHeight: 1.7 }} />
        </div>
        <div>
          <label style={label}>إلى</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {(
              [
                ["all", "كل المعهد"],
                ["role", "دور أو أكثر"],
                ["cohort", "فوج"],
                ["user", "إعلان موجّه"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setKind(k)} style={{ ...chipStyle(kind === k), padding: "8px 14px" }}>
                {l}
              </button>
            ))}
          </div>
          {kind === "role" && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {/* «الكل»: يختار كل الأدوار، والضغط ثانيةً يلغيها */}
              <button
                type="button"
                onClick={() => setRoles(roles.length === ROLE_AUDIENCES.length ? [] : [...ROLE_AUDIENCES])}
                style={{ ...chipStyle(roles.length === ROLE_AUDIENCES.length), padding: "7px 12px" }}
              >
                {roles.length === ROLE_AUDIENCES.length ? "✓ " : ""}الكل
              </button>
              {ROLE_AUDIENCES.map((r) => {
                const on = roles.includes(r);
                return (
                  <button key={r} type="button" onClick={() => toggleRole(r)} style={{ ...chipStyle(on), padding: "7px 12px" }}>
                    {on ? "✓ " : ""}
                    {r === "GUARDIAN" ? "أولياء الأمور" : ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
          )}
          {kind === "cohort" && (
            <Select value={cohortId} onChange={setCohortId} options={cohorts.map((c) => ({ value: c.id, label: `فوج ${c.name}` }))} width={260} />
          )}
          {kind === "cohort" && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>موظفو الفوج ومدرّسو حلقاته وأولياء أمور طلابه.</div>}
          {kind === "user" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(
                  [
                    ["all", "الكل"],
                    ["staff", "موظف"],
                    ["guardian", "ولي أمر"],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setWho(k)} style={{ ...chipStyle(who === k), padding: "6px 12px" }}>
                    {l}
                  </button>
                ))}
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={inputStyle()}
                placeholder={who === "guardian" ? "ابحثوا باسم الطالب أو رقمه" : who === "staff" ? "ابحثوا باسم الموظف" : "ابحثوا باسم الموظف أو اسم الطالب أو رقمه"}
              />
              {q.trim() && matches.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>لا نتائج.</div>}
              {matches.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 240, overflow: "auto" }}>
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPicked((cur) => [...cur, p.id]);
                        setQ("");
                      }}
                      style={{ textAlign: "start", padding: "8px 11px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--card-grad)", color: "var(--ink)", fontSize: 13, cursor: "pointer" }}
                    >
                      {p.label} <span style={{ color: "var(--ink-3)", fontSize: 11.5 }}>· {p.meta}</span>
                    </button>
                  ))}
                </div>
              )}
              {picked.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {picked.map((id) => (
                    <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, border: "1px solid var(--accent-line)", background: "var(--chip)", fontSize: 12.5 }}>
                      {personOf(id)?.label}
                      <button type="button" aria-label="إزالة" onClick={() => setPicked((cur) => cur.filter((x) => x !== id))} style={{ border: 0, background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontSize: 14, padding: 0 }}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>يصل الإعلان إلى المختارين وحدهم — شخص واحد أو أكثر.</div>
            </div>
          )}
        </div>
        {notice && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              fontSize: 13.5,
              border: notice.ok ? "1px solid rgba(111,191,139,0.5)" : "1px solid var(--notice-line)",
              background: notice.ok ? "linear-gradient(135deg, rgba(111,191,139,0.16), rgba(111,191,139,0.03))" : "var(--notice-soft)",
            }}
          >
            {notice.text}
          </div>
        )}
        <div>
          <button type="button" onClick={send} disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الإرسال…" : "إرسال الإعلان"}
          </button>
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700 }}>الإعلانات المرسلة</div>
      {sent.length === 0 ? (
        <div style={{ ...cardStyle, padding: 26, textAlign: "center", color: "var(--ink-2)", fontSize: 13 }}>لم يُرسل إعلان بعد.</div>
      ) : (
        sent.map((a) => (
          <div key={a.id} style={{ ...cardStyle, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{a.title}</div>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, border: "1px solid var(--line)", background: "var(--chip)" }}>{a.audienceLabel}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", whiteSpace: "pre-line" }}>{a.body}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "var(--ink-3)" }}>
              <span>{a.by}</span>
              <span>{a.at}</span>
              <span>
                قرأه {a.read} من {a.recipients}
              </span>
              <span style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
                {confirmDel === a.id ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await deleteAnnouncement(a.id);
                          setConfirmDel(null);
                          if (res.error) setNotice({ ok: false, text: res.error });
                          router.refresh();
                        })
                      }
                      style={{ padding: "5px 11px", borderRadius: 8, border: "1px solid var(--bad)", background: "transparent", color: "var(--bad)", fontSize: 12, cursor: "pointer" }}
                    >
                      تأكيد الحذف
                    </button>
                    <button type="button" onClick={() => setConfirmDel(null)} style={{ padding: "5px 11px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 12, cursor: "pointer" }}>
                      إلغاء
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmDel(a.id)} style={{ padding: "5px 11px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 12, cursor: "pointer" }}>
                    حذف
                  </button>
                )}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
