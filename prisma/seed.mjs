import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const COHORTS = [
  { id: "thabet-1", name: "ثابت 1", isRotating: false },
  { id: "thabet-2", name: "ثابت 2", isRotating: false },
  { id: "thabet-3", name: "ثابت 3", isRotating: false },
  { id: "qallab-1", name: "قلّاب 1", isRotating: true },
  { id: "qallab-2", name: "قلّاب 2", isRotating: true },
];

// بنك أسئلة التجويد لسبر "حاضراً" — من خطة عمل المعلم في التجويد العملي والنظري.
// الجزء 1-20 فقط؛ الأجزاء 21-30 ترث تراكميًا أسئلة الجزء 20 فما دون (لا صف مستقل لها).
const TAJWEED_TOPICS = [
  "أحكام (الإظهار - الإدغام) - المشدد الأغن - القلقلة",
  "أحكام (الإقلاب - الإخفاء) - الهمس (ك - ت)",
  "أحكام الميم الساكنة",
  "تمكين بعض الأحكام الفرعية",
  "الإدغامات (المتجانس - المتقارب - المتماثل)",
  "أحكام الراء (التفخيم)",
  "أحكام الراء (الترقيق - جواز الوجهين)",
  "المدود الأصلية",
  "المدود الفرعية (سببها الهمز)",
  "المدود الفرعية (سببها السكون)",
  "مخارج الحروف إلى طرف اللسان",
  "مخارج الحروف (تكملة)",
  "صفات الحروف: الاستعلاء والاستفال",
  "صفات الحروف (تكملة) — الصفات التي لها ضد",
  "صفات الحروف: الصفير - القلقلة - اللين",
  "صفات الحروف: الانحراف - التكرير - التفشي - الاستطالة",
  "السكت",
  "الألفات السبع - همزة الوصل",
  "الوقف والابتداء",
  "امتحان كتابي بمقرر مختصر الدر الثمين",
].map((text, i) => ({ id: `tajweed-${i + 1}`, juz: i + 1, text, order: i + 1 }));

// Idempotent: safe to run on every deploy.
async function main() {
  for (const c of COHORTS) {
    await prisma.cohort.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  for (const t of TAJWEED_TOPICS) {
    await prisma.tajweedTopic.upsert({ where: { id: t.id }, update: t, create: t });
  }

  await prisma.workingDays.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, days: JSON.stringify([]) },
  });

  const directorUsername = "director";
  const existing = await prisma.user.findUnique({ where: { username: directorUsername } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("Khaled@2026", 10);
    await prisma.user.create({
      data: { name: "مدير المعهد", username: directorUsername, passwordHash, role: "DIRECTOR" },
    });
    console.log("تمت تهيئة حساب مدير المعهد الأول (director).");
  }

  console.log("التهيئة مكتملة: الأفواج الخمسة، إعداد أيام الدوام، وحساب مدير المعهد.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
