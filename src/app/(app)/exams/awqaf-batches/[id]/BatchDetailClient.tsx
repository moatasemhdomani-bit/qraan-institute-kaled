"use client";

import { useActionState, useRef } from "react";
import { cardStyle, softButtonStyle } from "@/lib/ui";
import NumberField from "@/components/NumberField";
import { awqafPassed, certStepLocked, type CertStep } from "@/lib/awqaf";
import { saveAwqafScore, setCertStep, bulkSetCertStep, archiveBatchCerts, type FormState } from "../actions";

type Result = {
  id: string;
  student: { id: string; no: number; name: string };
  score: number | null;
  nominationPresent: boolean;
  certArrived: boolean;
  certArchived: boolean;
  certFileUrl: string | null;
  certDelivered: boolean;
};

const STEP_TITLES: Record<CertStep, string> = { arrived: "وصول الشهادة", archived: "أرشفة الشهادة", delivered: "تسليم الشهادة" };

export default function BatchDetailClient({ batchId, batchFileUrl, results }: { batchId: string; batchFileUrl: string | null; results: Result[] }) {
  const passedResults = results.filter((r) => awqafPassed(r.score, r.nominationPresent) === true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <BatchArchive batchId={batchId} fileUrl={batchFileUrl} passedCount={passedResults.length} />
      {passedResults.length > 0 && (
        <div style={{ ...cardStyle, padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>أزرار جماعية — تُطبَّق على الناجحين المؤهَّلين فقط:</span>
          <BulkButton batchId={batchId} step="arrived" label="تأكيد وصول الكل" />
          <BulkButton batchId={batchId} step="delivered" label="تسليم الكل" />
        </div>
      )}

      {results.map((r) => (
        <ResultRow key={r.id} result={r} />
      ))}
    </div>
  );
}

/** «أرشفة الشهادات»: ملف واحد (PDF أو صورة) لكل الدفعة — يُعدّ به كل ناجح وصلت شهادته وأُرشفت. */
function BatchArchive({ batchId, fileUrl, passedCount }: { batchId: string; fileUrl: string | null; passedCount: number }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(archiveBatchCerts, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 240px" }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>أرشفة شهادات الدفعة</div>
        <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 3 }}>
          {fileUrl
            ? "أُرشفت شهادات الدفعة بملف واحد — يمكن استبداله."
            : `ملف واحد ممسوح لكل شهادات الدفعة — يُعدّ به الناجحون (${passedCount}) مؤرشَفين.`}
        </div>
      </div>
      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noreferrer" style={{ ...softButtonStyle, textDecoration: "none" }}>
          عرض ملف الأرشفة
        </a>
      )}
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="batchId" value={batchId} />
        <label style={{ ...softButtonStyle, cursor: pending ? "wait" : "pointer", display: "inline-block", opacity: pending ? 0.7 : 1 }}>
          {pending ? "جارٍ الرفع…" : fileUrl ? "استبدال ملف الأرشفة" : "أرشفة الشهادات"}
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,application/pdf"
            style={{ display: "none" }}
            disabled={pending}
            onChange={(e) => {
              if (e.target.files?.[0]) formRef.current?.requestSubmit();
            }}
          />
        </label>
      </form>
      {state.error && <span style={{ width: "100%", fontSize: 12, color: "#E08A8A" }}>{state.error}</span>}
    </div>
  );
}

function BulkButton({ batchId, step, label, disabledHint }: { batchId: string; step: CertStep; label: string; disabledHint?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(bulkSetCertStep, {});
  return (
    <form action={formAction} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input type="hidden" name="batchId" value={batchId} />
      <input type="hidden" name="step" value={step} />
      <button type="submit" disabled={pending} style={softButtonStyle} title={disabledHint}>
        {label}
      </button>
      {state.error && <span style={{ fontSize: 11, color: "#E08A8A" }}>{state.error}</span>}
    </form>
  );
}

function ResultRow({ result }: { result: Result }) {
  const passed = awqafPassed(result.score, result.nominationPresent);
  const [scoreState, scoreAction, scorePending] = useActionState<FormState, FormData>(saveAwqafScore, {});

  return (
    <div style={{ ...cardStyle, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{result.student.name}</span>
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>#{result.student.no}</span>
        <span style={{ fontSize: 10.5, color: "var(--ink-3)", border: "1px solid var(--line)", borderRadius: 999, padding: "1px 8px" }}>
          {result.nominationPresent ? "حاضرًا — حدّ 90" : "غيبًا — حدّ 80"}
        </span>
        {passed != null && (
          <span
            style={{
              marginInlineStart: "auto",
              padding: "4px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              border: `1px solid ${passed ? "rgba(111,191,139,0.5)" : "rgba(224,138,138,0.55)"}`,
              color: passed ? "#6FBF8B" : "#E08A8A",
              background: passed ? "rgba(111,191,139,0.1)" : "rgba(224,138,138,0.14)",
            }}
          >
            {passed ? "ناجح" : "راسب"}
          </span>
        )}
      </div>

      <form action={scoreAction} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="hidden" name="id" value={result.id} />
        <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>العلامة</span>
        <NumberField
          name="score"
          defaultValue={result.score != null ? String(result.score) : ""}
          style={{ width: 90, minHeight: 36 }}
        />
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>/ 100</span>
        <button type="submit" disabled={scorePending} style={{ ...softButtonStyle, padding: "6px 13px" }}>
          حفظ
        </button>
        {scoreState.error && <span style={{ fontSize: 11.5, color: "#E08A8A" }}>{scoreState.error}</span>}
      </form>

      {passed === false && (
        <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>راسب — لا دورة شهادة له في هذه الدفعة.</div>
      )}

      {passed === true && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8, borderTop: "1px solid var(--line-2)" }}>
          <StepControl step="arrived" result={result} locked={false} />
          <StepControl step="archived" result={result} locked={certStepLocked("archived", result)} />
          <StepControl step="delivered" result={result} locked={certStepLocked("delivered", result)} />
        </div>
      )}
    </div>
  );
}

function StepControl({ step, result, locked }: { step: CertStep; result: Result; locked: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(setCertStep, {});
  const fileRef = useRef<HTMLFormElement>(null);
  const on = step === "arrived" ? result.certArrived : step === "archived" ? result.certArchived : result.certDelivered;

  if (locked) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: "var(--ink-3)", minWidth: 110 }}>{STEP_TITLES[step]}</span>
        <span
          style={{
            padding: "5px 12px",
            borderRadius: 999,
            fontSize: 11.5,
            border: "1px dashed var(--line)",
            color: "var(--ink-3)",
          }}
        >
          مقفل
        </span>
      </div>
    );
  }

  if (step === "archived") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--ink)", minWidth: 110 }}>{STEP_TITLES[step]}</span>
        {result.certFileUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.certFileUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", border: "1px solid var(--line)" }} />
        )}
        <form ref={fileRef} action={formAction} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input type="hidden" name="id" value={result.id} />
          <input type="hidden" name="step" value="archived" />
          <input type="hidden" name="value" value="1" />
          <label style={{ ...softButtonStyle, cursor: "pointer" }}>
            {on ? "استبدال الملف" : "رفع ملف الشهادة"}
            <input
              type="file"
              name="file"
              accept="image/png,image/jpeg,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files?.[0]) fileRef.current?.requestSubmit(); }}
            />
          </label>
        </form>
        {on && <ToggleOffButton step="archived" resultId={result.id} />}
        {pending && <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>جارٍ الرفع…</span>}
        {state.error && <span style={{ fontSize: 11.5, color: "#E08A8A" }}>{state.error}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13, color: "var(--ink)", minWidth: 110 }}>{STEP_TITLES[step]}</span>
      {on ? (
        <>
          <span
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 700,
              border: "1px solid rgba(111,191,139,0.5)",
              color: "#6FBF8B",
              background: "rgba(111,191,139,0.1)",
            }}
          >
            ✓ تم
          </span>
          <ToggleOffButton step={step} resultId={result.id} />
        </>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="id" value={result.id} />
          <input type="hidden" name="step" value={step} />
          <input type="hidden" name="value" value="1" />
          <button type="submit" disabled={pending} style={softButtonStyle}>
            {step === "arrived" ? "تأكيد الوصول" : "تأكيد التسليم"}
          </button>
        </form>
      )}
      {state.error && <span style={{ fontSize: 11.5, color: "#E08A8A" }}>{state.error}</span>}
    </div>
  );
}

function ToggleOffButton({ step, resultId }: { step: CertStep; resultId: string }) {
  const [, formAction, pending] = useActionState<FormState, FormData>(setCertStep, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={resultId} />
      <input type="hidden" name="step" value={step} />
      <input type="hidden" name="value" value="0" />
      <button type="submit" disabled={pending} style={{ ...softButtonStyle, background: "transparent", fontSize: 11 }}>
        إلغاء
      </button>
    </form>
  );
}
