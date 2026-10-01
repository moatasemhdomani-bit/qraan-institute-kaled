"use client";

import { useEffect, useRef, useState } from "react";
import { primaryButtonStyle } from "@/lib/ui";

const VIEW = 280; // حجم إطار القص على الشاشة
const OUT = 640; // حجم الصورة الناتجة (مربّعة) — صغيرة بما يكفي للرفع السريع
const MAX_ZOOM = 4;

type Crop = { zoom: number; x: number; y: number }; // x/y: موضع زاوية الصورة العليا بالنسبة لإطار القص

/** نافذة قصّ مربّع: سحب لتحريك الصورة، وتكبير/تصغير بالأزرار أو المنزلق أو عجلة الفأرة. */
function CropDialog({ file, onDone, onCancel }: { file: File; onDone: (f: File, url: string) => void; onCancel: () => void }) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState("");
  const [crop, setCrop] = useState<Crop>({ zoom: 1, x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createImageBitmap(file, { imageOrientation: "from-image" })
      .then((b) => {
        if (cancelled) return b.close();
        setBitmap(b);
        const s = VIEW / Math.min(b.width, b.height);
        setCrop({ zoom: 1, x: (VIEW - b.width * s) / 2, y: (VIEW - b.height * s) / 2 });
      })
      .catch(() => setError("تعذّر فتح الصورة — جرّبوا صورة JPG أو PNG أخرى."));
    return () => {
      cancelled = true;
    };
  }, [file]);

  const baseScale = bitmap ? VIEW / Math.min(bitmap.width, bitmap.height) : 1;

  /** يُبقي الصورة مغطّية لإطار القص كاملًا (لا فراغ عند الحواف). */
  function clamp(c: Crop): Crop {
    if (!bitmap) return c;
    const s = baseScale * c.zoom;
    const w = bitmap.width * s;
    const h = bitmap.height * s;
    return { zoom: c.zoom, x: Math.min(0, Math.max(VIEW - w, c.x)), y: Math.min(0, Math.max(VIEW - h, c.y)) };
  }

  /** تكبير/تصغير حول مركز الإطار. */
  function setZoom(z: number) {
    const zoom = Math.min(MAX_ZOOM, Math.max(1, z));
    setCrop((c) => {
      const ratio = zoom / c.zoom;
      const cx = VIEW / 2;
      return clamp({ zoom, x: cx - (cx - c.x) * ratio, y: cx - (cx - c.y) * ratio });
    });
  }

  // رسم المعاينة داخل الإطار
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !bitmap) return;
    const s = baseScale * crop.zoom;
    ctx.clearRect(0, 0, VIEW, VIEW);
    ctx.drawImage(bitmap, crop.x, crop.y, bitmap.width * s, bitmap.height * s);
  }, [bitmap, crop, baseScale]);

  async function confirm() {
    if (!bitmap) return;
    const s = baseScale * crop.zoom;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, -crop.x / s, -crop.y / s, VIEW / s, VIEW / s, 0, 0, OUT, OUT);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) return setError("تعذّر حفظ الصورة المقصوصة.");
    const out = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    onDone(out, URL.createObjectURL(blob));
  }

  const btn: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--btn-soft)",
    color: "var(--ink)",
    fontSize: 20,
    lineHeight: 1,
    fontFamily: "inherit",
    cursor: "pointer",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(6,12,24,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(360px, 100%)",
          borderRadius: 16,
          border: "1px solid var(--line)",
          background: "var(--card-grad), var(--panel-solid)",
          boxShadow: "var(--glow)",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div style={{ alignSelf: "stretch" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>قصّ الصورة</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>اسحب الصورة لتحريكها، وكبّر أو صغّر لضبط الإطار.</div>
        </div>

        {error ? (
          <div style={{ fontSize: 13, color: "var(--bad)", padding: "30px 0" }}>{error}</div>
        ) : (
          <canvas
            ref={canvasRef}
            width={VIEW}
            height={VIEW}
            style={{
              width: VIEW,
              maxWidth: "100%",
              height: "auto",
              aspectRatio: "1 / 1",
              borderRadius: 14,
              border: "2px solid var(--accent-line)",
              background: "#000",
              touchAction: "none",
              cursor: dragging ? "grabbing" : "grab",
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
              setDragging(true);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              // المعاينة قد تُعرض أصغر من حجمها الفعلي على الشاشات الضيقة
              const k = VIEW / e.currentTarget.getBoundingClientRect().width;
              setCrop((c) => clamp({ zoom: c.zoom, x: d.x + (e.clientX - d.px) * k, y: d.y + (e.clientY - d.py) * k }));
            }}
            onPointerUp={() => {
              drag.current = null;
              setDragging(false);
            }}
            onPointerCancel={() => {
              drag.current = null;
              setDragging(false);
            }}
            onWheel={(e) => setZoom(crop.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))}
          />
        )}

        <div dir="ltr" style={{ display: "flex", alignItems: "center", gap: 10, alignSelf: "stretch" }}>
          <button type="button" aria-label="تصغير" onClick={() => setZoom(crop.zoom / 1.2)} style={btn} disabled={!bitmap}>
            −
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            disabled={!bitmap}
            aria-label="درجة التكبير"
            style={{ flex: 1, accentColor: "var(--gold)" }}
          />
          <button type="button" aria-label="تكبير" onClick={() => setZoom(crop.zoom * 1.2)} style={btn} disabled={!bitmap}>
            +
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, alignSelf: "stretch" }}>
          <button type="button" onClick={confirm} disabled={!bitmap} style={{ ...primaryButtonStyle, flex: 1, opacity: bitmap ? 1 : 0.6 }}>
            اعتماد الصورة
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

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
  // الملف الأصلي المختار — يبقى ليُعاد قصّه؛ والملف المقصوص وحده هو ما يُرفع
  const [original, setOriginal] = useState<File | null>(null);
  const [cropping, setCropping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = (capture: boolean) => {
    const input = inputRef.current;
    if (!input) return;
    if (capture) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  };

  function setInputFile(f: File | null) {
    const input = inputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    if (f) dt.items.add(f);
    input.files = dt.files;
  }

  const smallBtn: React.CSSProperties = {
    padding: "7px 13px",
    borderRadius: 9,
    border: "1px solid var(--line)",
    background: "var(--btn-soft)",
    color: "var(--ink)",
    fontSize: 12,
    fontFamily: "inherit",
    cursor: "pointer",
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
        <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 8 }}>JPG أو PNG — تُقصّ وتُصغَّر قبل الرفع</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => openPicker(false)} style={smallBtn}>
            {preview ? "استبدال الصورة" : "رفع صورة"}
          </button>
          <button type="button" onClick={() => openPicker(true)} style={smallBtn}>
            التقاط صورة
          </button>
          {original && (
            <button type="button" onClick={() => setCropping(true)} style={smallBtn}>
              قصّ وتكبير
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            name={name}
            accept="image/png,image/jpeg"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setOriginal(f);
              setCropping(true);
            }}
          />
        </div>
      </div>

      {cropping && original && (
        <CropDialog
          file={original}
          onDone={(f, url) => {
            setInputFile(f);
            setPreview(url);
            setCropping(false);
          }}
          onCancel={() => {
            setCropping(false);
            // إلغاء أول قصّ لصورة جديدة: لا تُرفع الصورة الخام كما هي
            if (!inputRef.current?.files?.[0] || inputRef.current.files[0] === original) {
              setInputFile(null);
              setOriginal(null);
              setPreview(existingUrl || null);
            }
          }}
        />
      )}
    </div>
  );
}
