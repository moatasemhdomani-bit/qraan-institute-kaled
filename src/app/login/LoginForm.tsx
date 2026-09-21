"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { primaryButtonStyle } from "@/lib/ui";
import PasswordField from "@/components/PasswordField";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="login-grid" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.05fr 1fr", alignItems: "stretch" }}>
      <div
        className="login-form-panel"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "52px 44px",
          background: "linear-gradient(to left, #050d1c 0%, #0A192F 45%, #142c4d 100%)",
        }}
      >
        <form action={formAction} style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <img src="/logo-mark.png" alt="" width={44} height={44} style={{ display: "block" }} />
            <div className="login-brand-text" style={{ color: "var(--ink-2)", lineHeight: 1.3 }}>
              معهد الصحابي الجليل
              <br />
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>خالد بن الوليد</strong>
            </div>
          </div>

          <h1 className="login-h1" style={{ fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>تسجيل الدخول</h1>
          <p className="login-lead" style={{ color: "var(--ink-2)", margin: 0 }}>
            ادخل بياناتك للمتابعة إلى لوحة التحكم الخاصة بدورك.
          </p>

          <label className="login-label" style={{ display: "block", color: "var(--ink-2)" }}>
            اسم المستخدم
          </label>
          <input
            name="username"
            className="login-input"
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)" }}
            autoComplete="username"
          />

          <label className="login-label" style={{ display: "block", color: "var(--ink-2)" }}>
            كلمة المرور
          </label>
          <div style={{ marginBottom: 10 }}>
            <PasswordField name="password" autoComplete="current-password" className="login-input" hideCopy />
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
            className="login-btn"
            style={{ ...primaryButtonStyle, width: "100%", opacity: pending ? 0.7 : 1, marginTop: 6 }}
          >
            {pending ? "جاري الدخول…" : "دخول"}
          </button>

          <div className="login-foot" style={{ color: "var(--ink-3)" }}>
            التوجيه بعد الدخول يختلف بحسب الدور.
          </div>
        </form>
      </div>

      <div className="login-hero" style={{ position: "relative", overflow: "hidden", borderInlineStart: "1px solid var(--line)" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--hero-grad)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--hero-glow)",
          }}
        />
        <div
          className="login-hero-content"
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
