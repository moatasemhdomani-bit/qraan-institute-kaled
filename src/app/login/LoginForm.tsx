"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { inputStyle, primaryButtonStyle } from "@/lib/ui";
import PasswordField from "@/components/PasswordField";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="login-grid" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.05fr 1fr", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" }}>
        <form action={formAction} style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "var(--btn-grad)",
                boxShadow: "var(--btn-shadow)",
              }}
            />
            <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.3 }}>
              معهد الصحابي الجليل
              <br />
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>خالد بن الوليد</strong>
            </div>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>تسجيل الدخول</h1>
          <p style={{ color: "var(--ink-2)", margin: "0 0 26px", fontSize: 14 }}>
            ادخل بياناتك للمتابعة إلى لوحة التحكم الخاصة بدورك.
          </p>

          <label style={{ display: "block", fontSize: 13, color: "var(--ink-2)", marginBottom: 6 }}>
            اسم المستخدم
          </label>
          <input name="username" style={{ ...inputStyle(), marginBottom: 14 }} autoComplete="username" />

          <label style={{ display: "block", fontSize: 13, color: "var(--ink-2)", marginBottom: 6 }}>
            كلمة المرور
          </label>
          <div style={{ marginBottom: 10 }}>
            <PasswordField name="password" autoComplete="current-password" />
          </div>

          {state.error && (
            <div
              style={{
                padding: "9px 12px",
                borderRadius: 9,
                border: "1px solid var(--notice-line)",
                background: "var(--notice-soft)",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{ ...primaryButtonStyle, width: "100%", fontSize: 15, opacity: pending ? 0.7 : 1, marginTop: 6 }}
          >
            {pending ? "جاري الدخول…" : "دخول"}
          </button>

          <div style={{ marginTop: 22, fontSize: 12, color: "var(--ink-3)" }}>
            التوجيه بعد الدخول يختلف بحسب الدور.
          </div>
        </form>
      </div>

      <div
        className="login-hero"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--hero-grad)",
          borderInlineStart: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--hero-glow)",
          }}
        />
        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 48,
            gap: 14,
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: "0.14em", color: "var(--hero-ink-2)" }}>
            المرحلة 1 — البنية الأساسية
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, color: "var(--hero-ink)", lineHeight: 1.45, maxWidth: 340 }}>
            تسجيل العاملين، الأفواج، الحلقات، وتسجيل الطلاب في مكان واحد.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {["5 أفواج ثابتة", "5 أدوار", "سجل تدقيق"].map((t) => (
              <div
                key={t}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--hero-pill-line)",
                  background: "var(--hero-pill-bg)",
                  color: "var(--hero-ink)",
                  fontSize: 12,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
