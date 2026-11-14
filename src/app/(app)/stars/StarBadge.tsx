/** رصيد النجوم بلون ذهبي: «★ 12» */
export default function StarBadge({ n }: { n: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: n < 0 ? "var(--bad)" : "var(--gold)", fontVariantNumeric: "tabular-nums" }}>
      ★ {n}
    </span>
  );
}
