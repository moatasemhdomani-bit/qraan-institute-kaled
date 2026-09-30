/** نوع التدريس في المعهد: القرآن الكريم، أو كتاب «مختصر القراءة العربية». */
export type TrackId = "QURAN" | "ARABIC";

export const TRACKS: TrackId[] = ["QURAN", "ARABIC"];

export const TRACK_LABELS: Record<TrackId, string> = {
  QURAN: "قرآن",
  ARABIC: "قراءة عربية",
};

/** صفحات التسميع المسموحة: المصحف 1–604، وكتاب «مختصر القراءة العربية» 5–48. */
export function pageRange(track: TrackId | null | undefined): { min: number; max: number } {
  return track === "ARABIC" ? { min: 5, max: 48 } : { min: 1, max: 604 };
}

/** القراءة العربية: تسميع جديد فقط، بلا ماضٍ. */
export const hasPastRecitation = (track: TrackId | null | undefined) => track !== "ARABIC";

/** اسم الحلقة مع نوعها — «حلقة النور (قرآن)». */
export function halqaWithTrack(name: string, track: TrackId | null | undefined): string {
  return `${name} (${TRACK_LABELS[track ?? "QURAN"]})`;
}

/** تسمية دور الموظف مع نوعه: «مدرس قراءة عربية»، «مختبِر قراءة عربية». */
export function staffRoleLabel(role: string, track: TrackId | null | undefined, roleLabels: Record<string, string>): string {
  if (role === "TEACHER") return track === "ARABIC" ? "مدرس قراءة عربية" : "مدرس قرآن";
  if (role === "EXAMINER") return track === "ARABIC" ? "مختبِر قراءة عربية" : "مختبِر قرآن";
  return roleLabels[role] ?? role;
}
