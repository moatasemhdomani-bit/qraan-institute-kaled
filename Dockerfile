# Chromium لتصدير التقارير PDF (src/lib/pdf.ts) — حزمة apt القياسية تجلب كل مكتباتها
# المشتركة (libnspr4, libnss3, ...) تلقائيًا عبر إدارة الاعتماديات في Debian، بخلاف نهج
# Nixpacks + ثنائي Chromium المُجمَّع مسبقًا الذي فشل بمكتبة مفقودة عند التشغيل.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD npx prisma migrate deploy && node prisma/seed.mjs && npx next start -p ${PORT:-3000}
