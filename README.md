# يَسِّر — منصة تعليم الفقه الإسلامي

موقع ويب تعليمي (React + Vite + TypeScript + Firebase) لدراسة الفقه بأسلوب ميسّر:
فهرس كتب وأبواب ومسائل، بحث عربي متسامح، قاموس مصطلحات تفاعلي، مفضلة وفوائد وملاحظات
وعلامات وقف، مع مزامنة سحابية فائقة السرعة ولحظية بين مختلف أجهزة المستخدم الواحد،
وحفظ محلي آمن للزوار يهاجر تلقائيًا عند إنشاء الحساب.

> **المزامنة السحابية الحيّة:** تعمل طبقة المزامنة (`useLibrarySync`) على مستند `users/{uid}/data/library`
> بمستمع حيّ `onSnapshot` مع حلّ تعارض بالطوابع الزمنية (`updatedAt`) وتقليم شواهد الحذف تلقائيًا.
> الدفع ذكي ومتكيف (300ms للعمليات السريعة، 1000ms لكتابة الملاحظات)، مع دفع فوري عند قفل شاشة
> الهاتف أو مغادرة التبويب لمنع تجميد التعديلات.
>
> **حارس الزائر:** يحفظ بيانات الضيف محليًا بالكامل دون حجب القراءة، ويُظهر تنبيهًا إرشاديًا لطيفًا
> عند إضافة أول مفضلة أو علامة وقف للتشجيع على إنشاء حساب، مع ترحيل البيانات آليًا بعد تسجيل الدخول.
>
> **مصدر المحتوى:** السحابة ← كاش الجهاز ← حالة «تعذّر تحميل المسائل» صريحة مع إعادة محاولة.
> اللقطة المضمّنة (`src/data/lessons.ts`) **لا تُعرض للمستخدم أبدًا**: تبقى مدخلًا لصفحات
> SEO ومقارنةً في لوحة الإدارة فقط (تُحمَّل لحزمة المشرف وحده). السبب: نسخة مجمّدة تُعرض
> صامتة كأنها المحتوى الحقيقي = خطأ محتوى لا خطأ عرض.

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

بدون المفاتيح يعمل الموقع بالبيانات المحلية المضمّنة فقط (لقطة قديمة أقل من المسائل الحقيقية).

اختياري — App Check (حماية نقاط الكتابة من البوتات). **مُعطَّل افتراضيًا** لأن تطبيق الويب
غير مسجَّل في App Check بعد؛ تفعيله بدون تسجيل يُنتج 400 في كل تحميل بلا أي حماية:

```
VITE_FIREBASE_APPCHECK_KEY=...            # مفتاح reCAPTCHA v3
VITE_ENABLE_APPCHECK=true                 # لا تضبطه قبل تسجيل التطبيق في App Check
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=...    # للتطوير على localhost عند تفعيل الإنفاذ
```

اختياري — رفع مرفقات لوحة الإدارة عبر Cloudinary (بديلان افتراضيان مبنيان في الكود):

```
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

> ⚠️ أمني: `cloudName` و`uploadPreset` غير الموقّع **علنيان بطبيعتهما** (يُخبزان في الحزمة).
> الحماية الحقيقية على جانب Cloudinary: قيّد الـ preset (Settings ←‏ Upload ←‏ Upload presets)
> بـ Allowed formats و Max file size و Folder ثابت. للقفل الكامل بدّل إلى Signed upload
> عبر وسيط خادمي. القيم الافتراضية موجودة في `src/utils/cloudinary.ts`.

> ملاحظة: إنفاذ App Check في `firestore.rules` خطوة لاحقة — تُفعَّل **بعد** تسجيل التطبيق
> وخبز المفتاح في بناء الإنتاج، وإلا انكسرت كتابات العملاء وسكربت SEO (بلا توكن).
> سياسة الاحتفاظ بسجل الأخطاء: فعّل TTL من الكونسول على مجموعة `client_errors` للحقل
> `expireAt` (يحذف تلقائيًا بعد 30 يومًا) — من Firestore ←‏ TTL policies.

## مفتاح حساب الخدمة (لسكربتات الإدارة فقط)

سكربتا `create-admin` و `upload:pdf` يكتبان إلى Firestore/Storage من الخادم، لأن قواعد
الأمان ترفض الكتابة من العميل. يحتاجان مفتاح حساب خدمة (خطوة محلية لا تُرفع أبدًا):

1. Firebase Console ←‏ Project Settings ←‏ Service accounts ←‏ Generate new private key
2. احفظ الملف باسم `scripts/service-account.json` (مستثنى من git)، أو ضع مساره في
   متغير البيئة `GOOGLE_APPLICATION_CREDENTIALS`.

بدون هذا المفتاح يعمل الموقع عاديًا؛ السكربتان فقط هما من يحتاجانه.

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | خادم التطوير |
| `npm run build` | توليد صفحات SEO ثم بناء الإنتاج |
| `npm run preview` | معاينة نسخة الإنتاج محليًا |
| `npm run typecheck` | فحص TypeScript بدون إصدار |
| `npm run lint` | فحص ESLint |
| `npm test` | اختبارات vitest |
| `npm run backup` | تنزيل نسخة احتياطية شاملة من Firestore إلى `backups/` (تدعم بيانات المستخدمين ومكتباتهم بالكامل) |
| `npm run content:snapshot` | توليد اللقطة المحلية `data/content/lessons.json` من Firestore (مفصولة خارج src/) |
| `npm run check:content` | فحص تطابق اللقطة مع السحابة (`-- --strict` يفشل عند الانحراف) |
| `npm run check:seo` | فحص الصفحات الثابتة: canonical + صورة معاينة + زر يقود للتطبيق (يفشل عند الكسر) |
| `npm run audit:data` | تحليل تغطية المحتوى |
| `npm run create-admin -- "email" "pass"` | إنشاء/تحديث حساب مشرف عبر Admin SDK (يحتاج مفتاح حساب خدمة) |
| `npm run upload:pdf` | رفع `public/fiqh-book.pdf` إلى Firebase Storage عبر Admin SDK |
| `npm run test:e2e` | اختبارات التكامل الشاملة بمقاس الجوال عبر Playwright |
| `npm run deploy:hosting` | فحص الأنواع (`typecheck`) ثم بناء ونشر على Firebase Hosting |
| `npm run deploy:rules` | نشر قواعد أمان Firestore Rules |
| `npm run deploy:all` | فحص الأنواع ثم البناء ونشر الاستضافة والقواعد معًا |

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
  hooks/                      # useAppData, useUserLibrary, useStopMarks, useHashRoute, useOnlineStatus
  firebase/                   # config (تحميل مؤجل) + services (طبقة Firestore)
  data/                       # لقطة محلية احتياطية (lessons, glossary, books)
  utils/                      # تنسيق النصوص، الطباعة، النسخ الاحتياطي، أدوات القاموس
scripts/
  generate-seo.mjs            # توليد صفحات SEO قبل البناء (تلقائي)
  snapshot-content.mjs        # لقطة المحتوى المحلية من Firestore
  migrate-to-firestore.mjs    # رفع البيانات المحلية (مرة واحدة)
  backup-firestore.mjs        # تنزيل نسخة احتياطية مؤرخة (دوري)
  create-admin.mjs / upload-pdf.mjs / analyze-*.mjs
```

## النشر

```bash
npm run deploy:hosting   # بناء + نشر الواجهة
npm run deploy:rules     # نشر قواعد Firestore فقط
npm run deploy:all       # الاثنان معًا
```

> Node: المشروع يستهدف **22** (`.nvmrc` و`engines`). على Node 26 يفشل `firebase-tools`
> في فحص المحرك، ولذلك سكربتات النشر تستخدم `--engine-strict=false` مع إصدار مثبّت (`@15`).
> الأفضل: `nvm use` قبل النشر.

- **ترويسات أمان** في `firebase.json` (تعمل على كل المسارات): `nosniff` · `Referrer-Policy` ·
> `X-Frame-Options: DENY` · `Permissions-Policy` (تعطيل الكاميرا/الميكروفون/الموقع…) ·
> `Cross-Origin-Opener-Policy: same-origin-allow-popups` (يلزم لبقاء popup تسجيل Google) ·
> و`Content-Security-Policy-Report-Only`.
> الـ CSP مراقبة فقط حاليًا: **صفر مخالفات** على تحميل كامل (مُقاس بمستمع
> `securitypolicyviolation`). بعد فترة مراقبة بلا مخالفات، انقلها إلى ترويسة مُنفَّذة
> `Content-Security-Policy`.

- الاستضافة: Firebase Hosting (المجلد `dist`) — راجع `firebase.json`
- **لا يوجد rewrite شامل:** أي مسار غير موجود يُرجع 404 حقيقيًا. (الـ rewrite الشامل كان
  يُرجع صفحة التطبيق بنجاح 200 لأي مسار — يُفسد SEO ويُعطّل تحديث أي Service Worker قديم
  لأن `/sw.js` كان يُرجع HTML بدل ملف JS)
- المسارات العامة: `/` (التطبيق بتوجيه هاشي `#/...`) + صفحات مُجهّزة `/lessons/{id}/` و
  `/books/{اسم الكتاب}/` — تُكتب بأسماء مجلدات حقيقية غير مُرمَّزة، لأن الخادم يفكّ ترميز
  المسار قبل مطابقة الملف
- **النشر:** `.github/workflows/deploy.yml` ينشر تلقائيًا على Firebase Hosting عند كل دفع
  إلى `main` — بعد نجاح typecheck/lint/test/check:seo. يتطلب سرًّا واحدًا
  (`FIREBASE_TOKEN` = ناتج `npx firebase-tools login:ci`). بدون السرّ يُفشَل تشغيل النشر
  صراحةً بدل أن يمرّ صامتًا، ويبقى `npm run deploy:hosting` للنشر اليدوي.
## إعادة بناء ما أُزيل

| الطبقة | الحالة |
|---|---|
| المزامنة السحابية | مفعّلة بالكامل على `users/{uid}/data/library` مع قواعد أمان للمالك وحلّ تعارض فائق السرعة |
| التطبيق المثبّت (PWA) | محذوف اختياريًا؛ الموقع يعمل كموقع ويب متجاوب عالي الأداء مع كاش محلي وتوليد SEO |
| App Check | اختياري (متاح تفعيله بعد تسجيل التطبيق في Console عبر `VITE_ENABLE_APPCHECK=true`) |

## قواعد الكود

- TypeScript صارم (`npm run typecheck`) — والمعرّفات تُقارن كنصوص دائمًا `String(id)` (رقم/نص من مصادر مختلفة)
- Firebase يُحمّل مؤجلًا عبر `import()` — ممنوع أي استيراد runtime ثابت من `firebase/*` (يسمح `import type` فقط)
- أي وصول لـ `localStorage` داخل `try/catch` (انظر `src/utils/safeStorage.ts`)
- **لا تقرأ من الخادم قراءةً لقطية (`getDocsFromServer`) على استعلام له مستمع مفتوح** — يرمي
  `Target ID already exists` ويُفشل التحديث. أعِد فتح المستمع بدلًا من ذلك (انظر `useAppData`)
- **لا تستدعِ `enableNetwork` مرتين بلا `disableNetwork` بينهما** — يُفسد `pendingResponses`
  في SDK (يصبح `-1`) فيرمي `ca9`، ثم يموت طابور العمليات كله ويُصبح كل استدعاء لاحق يرمي
  `b815` حتى إعادة تحميل الصفحة. المرجع: `firebase-js-sdk#9968` (أُعيد إنتاجه بنفس الجدول).
  لذلك `enableFirestoreNetwork()` في `config.ts` تتجاهل النداء وهي متصلة، ولا تُستخدم إلا بعد
  `disableFirestoreNetwork()` صريح. (`reloadFromCloud` لا تستدعيها إطلاقًا.)
- **أخطاء التصيير لا تصل إلى `window.error`** — كول باك مستمع يُطلق أثناء flush لتحديث React
  يمرّ على `ErrorBoundary` أولًا. أي عطل قاتل يجب أن يُغطّى من **المسارين**: مستمعي window
  و`componentDidCatch`. ولا يجوز أن تمنع نافذة حماية إعادة التحميل إعادةَ التحميل: شاشة الخطأ
  الدائمة أسوأ من إعادة تحميل زائدة (الاختبار يثبّت هذا في `firestoreRecovery.test.ts`).
- شغّل النسخة الاحتياطية دوريًا قبل أي تعديل إداري واسع: `npm run backup`

## الاختبارات

`npm test` يشغّل Vitest (**29 ملف اختبار** تحوي **217 اختبار وحدة** بنسبة نجاح 100%). الخطافات والمكونات مُغطّاة ببيئة `jsdom` + `@testing-library/react`:

| الملف | مجال الحماية والتحقق |
|---|---|
| `hooks/useLibrarySync.live.test.ts` | المزامنة الحيّة السحابية: منع حلقات الكتابة، ابتلاع الصدى، التزامن السريع، معالجة فشل الشبكة، وعزل الحسابات |
| `hooks/useLibrarySync.guest.test.ts` | حارس الزائر: عزل كامل يمنع أي مساس بالسحابة قبل تسجيل الدخول |
| `Components/Auth/AuthContext.test.tsx` | سياق المصادقة: تسجيل الدخول/الخروج، فحص صلاحيات المشرف، حارس UID لمنع تلوّث الحسابات |
| `Components/Auth/LoginModal.test.tsx` | نافذة الدخول: نماذج البريد وGoogle، التبديل للتسجيل، أزرار الإغلاق والخروج |
| `Components/UI/GuestLoginPrompt.test.tsx` | حارس الزائر التوجيهي: عدم الإزعاج، كتم التكرار السريع لنفس الإجراء، وتنفيذ الإجراء المعلق بعد الدخول |
| `Components/UI/UpdateBanner.test.tsx` | إشعار التحديث: الظهور السلس مع scale animation، وتحديث النسخة عند النقر |
| `hooks/useAppData.test.ts` | لقطة كاش لا تُعلن نجاحًا؛ إعادة تحميل تُعلّق أو تفشل بصمت؛ حالة «لا محتوى» تنتهي بدوران؛ ترتيب الكتب |
| `hooks/useUserLibrary.test.ts` | ضياع تعديل محلي؛ خلط بيانات حسابين؛ عدم مسح مفاتيح الضيف بعد الدمج؛ التحديث الذري المدمج |
| `hooks/useStopMarks.test.ts` | علامة لا تُحفظ؛ تسرّب علامات حساب لآخر؛ رفض اللقطة المشوَّهة (مفتاح الكتاب مُرمَّز) |
| `Components/Content/QuoteCard.test.tsx` | بطاقة المتن: عرض النص، تحليل الروابط التشعبية للمسائل، مصطلحات القاموس، ونسخ النص للحافظة |
| `Components/Content/NotesCard.test.tsx` | بطاقة الملاحظات: حفظ الفوائد المحلية، إشعار النجاح، وحماية تصدير PDF من المحتوى الفارغ |
| `firebase/rulesSchema.test.ts` | فحص تطابق نصوص ومحاكاة منطقية لعقد مخطط قواعد Firestore (حقول مصرح بها، أسقف الأختام والملاحظات) |
| `utils/firestoreRecovery.test.ts` | مسارات التعافي من الأعطال الحرجة وإعادة التهيئة الآمنة دون شاشة خطأ دائمة |
| `utils/librarySync.test.ts` | خوارزمية دمج المكتبات وحل التعارض بالطوابع الزمنية وتقليم شواهد القبور القديمة |
| `utils/contentSource.test.ts` | اعتبار نسخة غير مؤكدة «محتوى جاهز» |

> **ملاحظة شفافية حول قواعد أمان Firestore:** اختبار `firebase/rulesSchema.test.ts` هو **فحص تطابق نصوص ومحاكاة منطقية لعقد المخطط** (Contract Check) للتأكد من توافق كتابات العميل مع قيود القواعد، وليس تشغيلًا لمحاكي Firestore Emulator الرسمي (`@firebase/rules-unit-testing`). الحالة الإيجابية التشغيلية للقواعد تُعتمد حيًا على السحابة.

قاعدة عملية: **أي عطل في الحالة يُضاف كاختبار قبل إصلاحه**. مثال مثبت: حذف
`settlePendingReload(true)` من `useAppData` (وهو العطل القديم «مزامنة تعلّق») يجعل
اختبار «إعادة التحميل تنجح» يفشل — تم التحقق بفحص طفرة.

## اختبارات التكامل (Playwright)

`npm run test:e2e` يبني نسخة الإنتاج (`dist`) ثم يشغّلها محليًا على المنفذ 4173
ويقرأها بمتصفح Chromium بمقاس Pixel 7. البوابة تختبر الكود الذي بين يديها، لا الموقع
المنشور (الفحص الحي يبقى خطوة مستقلة قبل النشر).

| المسار | يثبت |
|---|---|
| فهرس الكتب | المحتوى الحقيقي وصل من السحابة (لا حالة فارغة)، والعدّاد معروض |
| كتاب ← باب ← مسألة | التوجيه الهاشي يفتح شاشة القراءة بنص فعلي |
| المفضلة | تُحفظ في `localStorage` **وتبقى بعد إعادة تحميل الصفحة**، وتظهر في «المفضلة» |
| الملاحظة | تُكتب بمفاتيح حقيقية، تُحفظ، وتُستعاد بعد إعادة التحميل |
| البحث | زر البحث العائم على الفون، ثم نتيجة، ثم انتقال لمسألة |
| لوحة الإدارة | محجوبة عن الزائر بغياب تبويباتها |

كل مسار يتحقق أيضًا من **خلو الكونسول من الأخطاء** (مع تجاهل قطع الطلبات عند التنقل).
عطل Firestore الداخلي المعروف `ca9/b815` متقطّع (0 من 12 في مسابر متكررة، وقد يظهر
مرة عند إقلاع بارد) فلا يُفشل البوابة، لكنه **يُسجَّل كتعليق `firestore-glitch`** في
تقرير Playwright حتى لا يمرّ صامتًا.

ملاحظات تشغيلية مستفادة:
- على الفون زر البحث العائم اسمه **«بحث»** فقط؛ «بحث شامل» في الشريط الجانبي مخفي تحت `md`
- حقول React المُتحكَّم بها داخل الاختبار تُكتب بـ `pressSequentially` لا `fill`، وإلا
  وصل الضغط قبل أن تُحدَّث الحالة
- الاختبارات تعمل بـ `workers: 1` لأن `localStorage` مشترك بينها في المتصفح نفسه

في CI تعمل هذه المهمة فقط بعد ضبط **متغيّرات المستودع** (Settings → Secrets and
variables → Actions → **Variables**): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
`VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. القيم عامة بطبيعتها (تُشحن
داخل حزمة الموقع) ولا تُحفظ كأسرار — `secrets` ممنوع داخل `if` ويرفضه GitHub.
