"use client";

import { useRef, useState } from "react";

export default function PhotoField({
  name,
  label,
  existingUrl,
}: {
  name: string;
  label: string;
  existingUrl?: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = (capture: boolean) => {
    const input = inputRef.current;
    if (!input) return;
    if (capture) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 14,
        borderRadius: 12,
        border: "1px dashed var(--line)",
        background: "var(--card-2-grad)",
      }}
    >
      <div
        style={{
          width: 66,
          height: 66,
          flex: "none",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid var(--line)",
          background: "var(--card-2-grad)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-3)",
          fontSize: 13,
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          "بلا صورة"
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 8 }}>JPG أو PNG — حتى 2 ميغابايت</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => openPicker(false)}
            style={{
              padding: "7px 13px",
              borderRadius: 9,
              border: "1px solid var(--line)",
              background: "var(--btn-soft)",
              color: "var(--ink)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {preview ? "استبدال الصورة" : "رفع صورة"}
          </button>
          <button
            type="button"
            onClick={() => openPicker(true)}
            style={{
              padding: "7px 13px",
              borderRadius: 9,
              border: "1px solid var(--line)",
              background: "var(--btn-soft)",
              color: "var(--ink)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            التقاط صورة
          </button>
          <input
            ref={inputRef}
            type="file"
            name={name}
            accept="image/png,image/jpeg"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPreview(URL.createObjectURL(f));
            }}
          />
        </div>
      </div>
    </div>
  );
}
