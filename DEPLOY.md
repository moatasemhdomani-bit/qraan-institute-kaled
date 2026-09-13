# رفع الموقع على الإنترنت (Railway)

اخترنا Railway لأنه يستضيف الموقع وقاعدة البيانات ومساحة تخزين دائمة للصور في مكان واحد، دون تعديل أي كود.

## المتطلبات قبل البدء

- حساب **GitHub** (مجاني) — لرفع الكود عليه
- حساب **Railway** (railway.app) — يمكن التسجيل مباشرة بحساب GitHub، بلا بطاقة ائتمان للبدء
- (اختياري) اسم نطاق (domain) إن أردتم رابطًا خاصًا مثل `www.khaled-institute.com` بدل الرابط المجاني من Railway

هذه الحسابات يجب أن تُنشَأ من طرفكم مباشرة — لا يمكنني إنشاؤها نيابة عنكم.

## الخطوات

### 1) رفع الكود إلى GitHub

```bash
# من داخل مجلد المشروع khaled-institute
git remote add origin https://github.com/<اسم_حسابكم>/khaled-institute.git
git branch -M main
git push -u origin main
```

(أنشئوا أولًا مستودعًا (repository) فارغًا باسم `khaled-institute` من واجهة GitHub، بدون README أو .gitignore — المشروع يحتوي عليهما بالفعل.)

### 2) إنشاء المشروع في Railway

1. من لوحة Railway: **New Project → Deploy from GitHub repo** → اختاروا `khaled-institute`.
2. Railway يكتشف أنه مشروع Next.js تلقائيًا ويبدأ البناء.

### 3) إضافة قاعدة بيانات PostgreSQL

داخل نفس المشروع في Railway: **New → Database → Add PostgreSQL**. يُنشئ Railway القاعدة تلقائيًا ويوفّر رابط اتصال جاهز.

### 4) متغيرات البيئة (Environment Variables)

على خدمة الموقع (وليس خدمة القاعدة) أضيفوا:

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | من قائمة Railway المنسدلة، اختاروا مرجع رابط قاعدة PostgreSQL التي أنشأتموها (يظهر باسم شبيه بـ `${{Postgres.DATABASE_URL}}`) |
| `SESSION_SECRET` | `414267c6cb337d6c83fcddbc815ed05d10df28b17c818d086f29f3e9174b968f` |
| `NODE_ENV` | `production` |

> **مهم**: `SESSION_SECRET` أعلاه مُولَّد خصيصًا لهذا المشروع — لا تشاركوه علنًا، واعتبروه كلمة سر للنظام كاملة.

### 5) مساحة تخزين دائمة للصور

بدون هذه الخطوة، تُحذف الصور المرفوعة (صور الطلاب والعاملين) مع كل تحديث للموقع.

في إعدادات خدمة الموقع على Railway: **Volumes → New Volume**
- Mount path: `/app/public/uploads`

### 6) تهيئة قاعدة البيانات (مرة واحدة فقط)

بعد نجاح أول نشر (Deploy)، افتحوا Shell الخدمة من Railway (**Service → Settings → Shell**، أو زر الطرفية) ونفّذوا:

```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

هذا يُنشئ الجداول، ويزرع الأفواج الخمسة وحساب مدير المعهد الأول (`director` / `Khaled@2026`).

### 7) الرابط والنطاق

- Railway يمنحكم رابطًا فوريًا شكله `khaled-institute-production.up.railway.app`.
- لربط نطاق خاص بكم: **Settings → Networking → Custom Domain**، ثم أضيفوا سجل CNAME عند مزوّد النطاق كما يوضح Railway.

## بعد النشر

- سجّلوا الدخول بحساب `director` وغيّروا كلمة المرور (حاليًا يتم ذلك عبر تعديل قاعدة البيانات مباشرة من Railway — شاشة تغيير كلمة المرور ليست ضمن المرحلة 1).
- كل تحديث تالي على الكود: ادفعوه إلى GitHub (`git push`) — Railway يعيد النشر تلقائيًا.

## عند إضافة مراحل لاحقة (السبر، التقارير...)

نفس الخطوات تتكرر تلقائيًا — فقط ادفعوا الكود الجديد، ولن تحتاجوا لإعادة أي إعداد.
