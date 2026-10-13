/** رصيد النجوم بلون ذهبي: «★ 12» */
export default function StarBadge({ n }: { n: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>
      ★ {n}
    </span>
  );
}
