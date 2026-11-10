"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { NotificationItem } from "@/lib/notifications";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "./notifications/actions";

const POLL_MS = 2 * 60 * 1000;

/** «منذ 5 دقائق» / «منذ ساعتين» / التاريخ */
function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** جرس الإشعارات أعلى الشاشة: رقم غير المقروء، وقائمة الإشعارات عند الضغط */
export default function NotificationBell({ items: initialItems, unread: initialUnread }: { items: NotificationItem[]; unread: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState({ items: initialItems, unread: initialUnread });
  const { items, unread } = data;
  const reload = () =>
    fetchNotifications()
      .then((d) => d && setData(d))
      .catch(() => {});

  // عند كل تنقّل بين الشاشات، ودوريًا كل دقيقتين
  useEffect(() => {
    reload();
  }, [pathname]);
  useEffect(() => {
    const t = setInterval(reload, POLL_MS);
    return () => clearInterval(t);
  }, []);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const openItem = (n: NotificationItem) => {
    setOpen(false);
    start(async () => {
      if (!n.read) {
        await markNotificationRead(n.id);
        setData((d) => ({ unread: Math.max(0, d.unread - 1), items: d.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }));
      }
      if (n.href) router.push(n.href);
    });
  };

  return (
    <div ref={rootRef} style={{ position: "relative", marginInlineStart: "auto" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `الإشعارات — ${unread} غير مقروءة` : "الإشعارات"}
        style={{
          position: "relative",
          width: 42,
          height: 42,
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--card-2-grad)",
          color: "var(--ink)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              insetInlineEnd: -5,
              minWidth: 20,
              height: 20,
              padding: "0 5px",
              borderRadius: 99,
              background: "var(--bad)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 50,
            insetInlineEnd: 0,
            width: "min(380px, calc(100vw - 32px))",
            maxHeight: "70vh",
            overflow: "auto",
            zIndex: 60,
            borderRadius: 14,
            border: "1px solid var(--line)",
            background: "var(--card-grad), var(--panel-solid)",
            boxShadow: "var(--glow)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--line-2)", position: "sticky", top: 0, background: "var(--head-grad), var(--panel-solid)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, flex: 1 }}>الإشعارات</div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => start(async () => { await markAllNotificationsRead(); setData((d) => ({ unread: 0, items: d.items.map((x) => ({ ...x, read: true })) })); })}
                style={{ border: 0, background: "transparent", color: "var(--ink-2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: "26px 16px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>لا إشعارات بعد.</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                style={{
                  display: "flex",
                  gap: 10,
                  width: "100%",
                  textAlign: "start",
                  padding: "11px 14px",
                  border: 0,
                  borderBottom: "1px solid var(--line-2)",
                  background: n.read ? "transparent" : "color-mix(in srgb, var(--gold) 9%, transparent)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 99, marginTop: 7, flex: "none", background: n.read ? "transparent" : "var(--gold)" }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: n.read ? 500 : 700 }}>{n.title}</span>
                  {n.body && <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, whiteSpace: "pre-line" }}>{n.body}</span>}
                  <span style={{ display: "block", fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>{ago(n.at)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
