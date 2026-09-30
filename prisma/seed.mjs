import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// الأفواج وبنك أسئلة التجويد لم تعد تُهيَّأ هنا: الأفواج تُدار كليًا من «إدارة الأفواج» (إضافةً وحذفًا)،
// وبنك الأسئلة أُلغي — وإعادة تهيئتهما مع كل نشر كانت تُعيد ما يحذفه المستخدم.

// Idempotent: safe to run on every deploy.
async function main() {
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

  console.log("التهيئة مكتملة: إعداد أيام الدوام وحساب مدير المعهد.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
