import { chipStyle, ROLE_LABELS } from "@/lib/ui";
import { staffRoleLabel } from "@/lib/track";
import type { Session } from "@/lib/session";
import { switchAccount } from "./actions";

/**
 * التنقّل بين حسابات الموظف أعلى الشاشة — حساب لكل دور في الأفواج (الأفواج ذات الدور نفسه تجتمع في حساب واحد).
 * لا يظهر لمن له حساب واحد.
 */
export default function AccountSwitcher({ session }: { session: Session }) {
  if (session.accounts.length < 2) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: "var(--card-2-grad)",
      }}
    >
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>حساباتك:</span>
      {session.accounts.map((a) => {
        const label = `${staffRoleLabel(a.role, a.track, ROLE_LABELS)} — ${a.cohortNames.join("، ")}`;
        const active = a.role === session.role && a.track === session.track;
        return active ? (
          <span key={`${a.role}-${a.track}`} style={{ ...chipStyle(true), cursor: "default" }}>
            {label}
          </span>
        ) : (
          <form key={`${a.role}-${a.track}`} action={switchAccount}>
            <input type="hidden" name="role" value={a.role} />
            <input type="hidden" name="track" value={a.track} />
            <button type="submit" style={chipStyle(false)}>
              {label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
