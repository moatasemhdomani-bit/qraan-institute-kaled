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

// Idempotent: safe to run on every deploy.
async function main() {
  for (const c of COHORTS) {
    await prisma.cohort.upsert({ where: { id: c.id }, update: {}, create: c });
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
