# نظام الأخطاء في يَسِّر (Error Design System)

مرجع واحد لكل فشل يراه المستخدم. أي خطأ جديد يُصنَّف هنا أولًا، ثم يُعرض عبر المكوّن المخصّص
لعيئته — لا نصوص حرة في المكوّنات، ولا `alert()`/`window.confirm()`.

## 1. العائلات الست

| العائلة | مثال | المتلقّي | الملف |
|---|---|---|---|
| E1 خطأ تصيير | استثناء داخل مكوّن | شاشة كاملة | `src/errors/ErrorBoundary.tsx` |
| E2 خطأ بيانات/شبكة | فشل جلب، timeout، quota | بطاقة داخل المحتوى | `src/Components/UI/ErrorState.tsx` |
| E3 فشل عملية | نسخ فشل، توليد شهادة | إشعار (toast) | `src/errors/ToastProvider.tsx` + `useToast.ts` |
| E4 فقد اتصال | `navigator.onLine=false` | شريط ثابت | `src/Components/UI/OfflineBanner.tsx` |
| E5 رابط غير صحيح | معرّف محذوف / soft-404 | بطاقة + بدائل | `ErrorState` بـ`kind="notfound"` |
| E6 نسخة قديمة | شارد 404 بعد نشر | شريط تحديث | `src/Components/UI/UpdateBanner.tsx` |

## 2. القواعد

1. **السبب لا الصفعة.** كل رسالة: ماذا فشل + لماذا (سطر) + خطوة واحدة. ممنوع «حدث خطأ» بلا خطوة.
2. **RTL دائمًا، والثيم من التوكنات.** لا ألوان مباشرة (`#e74c3c`) ولا خلفيات مستقلة عن التطبيق.
3. **لا شاشة بيضاء.** `index.html` يحمل `#boot-fallback` ثابتًا داخل `#root`؛ إن سقطت الحزمة
   يظهر نص التحميل ثم «يبدو أن التحميل تعطّل» بعد 8 ثوانٍ.
4. **لا `alert()` / `window.confirm()`.** الإشعارات للرسائل، و`ConfirmProvider` للعمليات الخطرة.
   البوابة: `grep -rn "alert(\|window.confirm" src --include=*.tsx` يجب أن يكون فارغًا.
5. **لا stack trace للمستخدم.** التفاصيل تُسجَّل في `client_errors` و`sessionStorage`، والواجهة
   تعرض `err_xxxxxxxx` فقط (قابل للتحديد والنسخ).
6. **الوصول:** `role="alert"` للخطأ، `role="status"` للناعم، `aria-live`، تركيز على الزر الأول،
   احترام `prefers-reduced-motion`.

## 3. التصنيف والرمز

```ts
import { mapError } from '../errors/mapError';
const p = mapError(err, { scope: 'lessons.load' });
// p.kind, p.title, p.message, p.actionLabel, p.retryable, p.surface, p.incidentId
```

`classifyError` يقرأ `code`/`name`/`message` ويرتّب الأولويات: `stale` → `offline` → `permission`
→ `quota` → `notfound` → `timeout` → `network` → `unknown`.

كل خطأ يحمل `incidentId` (`err_` + 8 خانات hex). `logError(scope, err, { incidentId })` يكتب:
المستند في `client_errors` (scope, incidentId, message, url, ua, trail، و`expireAt` لسياسة TTL)،
وآخر 30 حدثًا في `sessionStorage['fiqh:error:ring']`.

## 4. أمثلة الاستخدام

```tsx
// بطاقة E2
<ErrorState kind="network" title="تعذّر تحميل المسائل" message="…" incidentId={p.incidentId}
  primaryAction={<RetryButton onRetry={reload} />} />

// إشعار E3 (بدل alert)
const toast = useToast();
toast.error('لم يتم النسخ — حدّد النص يدويًا وانسخه.');

// تأكيد خطر (بدل window.confirm)
const confirm = useConfirm();
if (!(await confirm({ title: 'حذف المصطلح', message: '…', confirmLabel: 'حذف', danger: true }))) return;
```

> الهوكات في ملفات مستقلة (`useToast.ts` / `useConfirm.ts`) لأن قاعدة
> `react-refresh/only-export-components` تمنع تصدير مكوّن + هوك من الملف نفسه.

## 5. الاختبار

- وحدة: `src/errors/*.test.ts(x)` — التصنيف، رمز الحادثة، حدود التصيير، حدّ 3 إشعارات.
- e2e: `e2e/app.e2e.ts` اختبار 22 (شاشة بيضاء عند حجب الحزمة).
- يدوي/axe: شغّل `axe` على شاشة E1 وبطاقة E2 في الثيمات الثلاثة — يجب أن تكون نظيفة.
