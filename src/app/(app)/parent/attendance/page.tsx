import { redirect } from "next/navigation";
import type { ParentSearch } from "../data";

/** «جدول الحضور» دُمج في «جدول التسميع والحضور» — الروابط القديمة (والإشعارات) تنتقل إليه بالابن والفترة نفسيهما */
export default async function ParentAttendancePage({ searchParams }: { searchParams: Promise<ParentSearch> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  redirect(`/parent/recitation${q ? `?${q}` : ""}`);
}
