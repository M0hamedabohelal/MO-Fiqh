# الباحث الفقهي — منصة تعليم الفقه الإسلامي

تطبيق ويب تعليمي (React + Vite + TypeScript + Firebase) لدراسة الفقه بأسلوب ميسّر:
فهرس كتب وأبواب ومسائل، بحث عربي متسامح، قاموس مصطلحات تفاعلي، مفضلة وفوائد وملاحظات
متزامنة سحابيًا، ودعم كامل للعمل دون إنترنت (PWA).

## التشغيل المحلي

```bash
npm install
npm run dev        # خادم التطوير
```

انسخ مفاتيح Firebase إلى `.env.local` (غير متتبع في git):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

بدون المفاتيح يعمل التطبيق بالبيانات المحلية فقط (قراءة عامة، بلا مزامنة).

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | خادم التطوير |
| `npm run build` | توليد صفحات SEO ثم بناء الإنتاج |
| `npm run preview` | معاينة نسخة الإنتاج محليًا |
| `npm run typecheck` | فحص TypeScript بدون إصدار |
| `npm run lint` | فحص ESLint |
| `npm test` | اختبارات vitest |
| `npm run backup` | تنزيل نسخة احتياطية من Firestore إلى `backups/` |
| `npm run deploy:hosting` | بناء + نشر على Firebase Hosting |

## البنية

```
src/
  App.tsx / main.tsx          # الدخول + تجميع الحالة
  types.ts                    # الأنواع المشتركة (Lesson, HighlightItem, ...)
  Components/
    Views/                    # الشاشات (كتب/أبواب/قراءة/مفضلة/...)
    Content/                  # بطاقات النص والشرح والفيديو
    Admin/                    # لوحة المشرفين (تحمّل عند الطلب)
    Auth/                     # سياق المصادقة + نافذة الدخول
    Layout/ Header/ Sidebar/ Navigation/ UI/
  hooks/                      # useAppData, useUserLibrary, useHashRoute, usePWA, ...
  firebase/                   # config (تحميل مؤجل) + services (طبقة Firestore)
  data/                       # نسخة محلية احتياطية (lessons, glossary, books)
  utils/                      # تنسيق النصوص، الطباعة، أدوات القاموس
scripts/
  generate-seo.mjs            # توليد صفحات SEO قبل البناء (تلقائي)
  migrate-to-firestore.mjs    # رفع البيانات المحلية (مرة واحدة)
  backup-firestore.mjs        # تنزيل نسخة احتياطية مؤرخة (دوري)
  generate-icons.mjs / create-admin.mjs / upload-pdf.mjs / analyze-*.mjs
```

## النشر

```bash
npm run deploy:hosting
```

- الاستضافة: Firebase Hosting (المجلد `dist`) — راجع `firebase.json`
- دفع الكود إلى GitHub **لا ينشر الموقع** (لا توجد Actions تلقائية) — زر "تحديث الموقع" يقارن النسخة **المنشورة** فقط

## قواعد الكود

- TypeScript صارم (`npm run typecheck`) — والمعرّفات تُقارن كنصوص دائمًا `String(id)` (رقم/نص من مصادر مختلفة)
- Firebase يُحمّل مؤجلًا عبر `import()` — ممنوع أي استيراد runtime ثابت من `firebase/*` (يسمح `import type` فقط)
- أي وصول لـ `localStorage` داخل `try/catch`
- بيانات الضيف تُحذف من الجهاز فقط **بعد نجاح** رفع الدمج للسحابة
- شغّل النسخة الاحتياطية دوريًا قبل أي تعديل إداري واسع: `npm run backup`
