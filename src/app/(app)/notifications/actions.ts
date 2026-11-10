"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { syncNotifications, loadNotifications, type NotificationItem } from "@/lib/notifications";

/** الجرس يطلبها عند تنقّل الصفحات ودوريًا — الإطار نفسه لا يُعاد رسمه عند التنقّل */
export async function fetchNotifications(): Promise<{ items: NotificationItem[]; unread: number } | null> {
  const session = await getSession();
  if (!session) return null;
  await syncNotifications(session);
  return loadNotifications(session.userId);
}

/** قراءة إشعار واحد (عند فتحه) */
export async function markNotificationRead(id: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({ where: { id, userId: session.userId, readAt: null }, data: { readAt: new Date() } });
}

/** «تحديد الكل كمقروء» */
export async function markAllNotificationsRead(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({ where: { userId: session.userId, readAt: null }, data: { readAt: new Date() } });
}
