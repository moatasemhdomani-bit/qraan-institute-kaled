import { formatJuz } from "@/lib/pastRecitation";
import { cardStyle } from "@/lib/ui";
import type { StudentPreview } from "@/lib/reports";
import { formatTime12, formatDateAr } from "@/lib/daily";

function passFailCell(pass: number, fail: number) {
  return (
    <span>
      <b style={{ color: "var(--ok)" }}>{pass}</b> / <b style={{ color: "var(--bad)" }}>{fail}</b>
    </span>
  );
}

const box = { padding: 10, borderRadius: 10, background: "var(--card-2-grad)", textAlign: "center" as const };

/** عرض تقرير الطالب: حضوره وتسميعه وسلوكه واختباراته — مشترك بين شاشة الإدارة (مع الإصدار) وشاشة المدرّس (مشاهدة فقط). */
export default function StudentReportPreview({ preview }: { preview: StudentPreview }) {
  return (
    <div style={{ ...cardStyle, padding: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{preview.studentName}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 14 }}>
        #{preview.studentNo} · {preview.halqaName} · {preview.cohortName}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 14 }}>
        <div style={box}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ok)" }}>{preview.attendance.present}</div>
          <div style={{ fontSize: 11, color: "var(--ink-2)" }}>حاضر</div>
        </div>
        <div style={box}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>{preview.attendance.late}</div>
          <div style={{ fontSize: 11, color: "var(--ink-2)" }}>متأخر</div>
        </div>
        <div style={box}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--info)" }}>{preview.attendance.excused}</div>
          <div style={{ fontSize: 11, color: "var(--ink-2)" }}>إذن</div>
        </div>
        <div style={box}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--bad)" }}>{preview.attendance.absent}</div>
          <div style={{ fontSize: 11, color: "var(--ink-2)" }}>غائب</div>
        </div>
        <div style={box}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{preview.newPages}</div>
          <div style={{ fontSize: 11, color: "var(--ink-2)" }}>صفحات جديد</div>
        </div>
        <div style={box}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{formatJuz(preview.pastJuz)}</div>
          <div style={{ fontSize: 11, color: "var(--ink-2)" }}>أجزاء ماضٍ</div>
        </div>
        <div style={box}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{preview.behavior}</div>
          <div style={{ fontSize: 11, color: "var(--ink-2)" }}>سلوك الطالب</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        <div style={{ padding: 10, borderRadius: 10, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>اختبار محلي</div>
          {passFailCell(preview.locPass, preview.locFail)}
        </div>
        <div style={{ padding: 10, borderRadius: 10, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>ترشيح الأوقاف</div>
          {passFailCell(preview.nomPass, preview.nomFail)}
        </div>
        <div style={{ padding: 10, borderRadius: 10, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>سبر الأوقاف الفعلي</div>
          {passFailCell(preview.realPass, preview.realFail)}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>إذن الطالب</div>
        {preview.permits.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>لا يوجد إذن</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {preview.permits.map((p) => (
              <div key={p.kind} style={{ padding: 10, borderRadius: 10, border: "1px solid var(--line)", fontSize: 12.5, lineHeight: 1.7 }}>
                <b style={{ color: p.kind === "ENTRY" ? "var(--ok)" : "var(--gold)" }}>{p.kind === "ENTRY" ? "إذن دخول" : "إذن خروج"}</b>{" "}
                — {p.kind === "ENTRY" ? "يدخل في" : "يخرج في"} {formatTime12(p.time)}
                <div style={{ color: "var(--ink-2)" }}>
                  الأيام: {p.days.length ? p.days.join("، ") : "كل أيام الدوام"} · قائم منذ {formatDateAr(p.since)}
                  {p.note ? ` · السبب: ${p.note}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
