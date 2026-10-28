// إعدادات Cloudinary لرفع المرفقات من لوحة الإدارة.
//
// ⚠️ أمني: `cloudName` و`uploadPreset` غير الموقّع **علنيان بطبيعتهما** — يُخبزان في حزمة
// العميل ولا يمكن إخفاؤهما كوديًا. الحماية الحقيقية على جانب Cloudinary:
//
//   ┌─ الإعداد الإلزامي في كونسول Cloudinary (Settings ← Upload ← Upload presets) ─┐
//   │ حضور الـ preset المذكور أعلاه، واضبط عليه:                                   │
//   │   • Signing Mode: Unsigned (مقبول لأن الحماية على القيود أدناه)              │
//   │   • Allowed formats: pdf,mp3,m4a,jpg,jpeg,png,webp  ← يطابق ALLOWED_UPLOAD_EXT │
//   │   • Max file size: 25000000  (25MB) ← يطابق CLOUDINARY_MAX_FILE_BYTES        │
//   │   • Folder: ثابت (مثل fiqh_attachments) لمنع الكتابة في مسارات عشوائية         │
//   │   • Moderation: تفعيلها اختياريًا لمنع رفع محتوى مخالف                         │
//   └──────────────────────────────────────────────────────────────────────────────┘
//
//  ملاحظة: للقفل الكامل (سرّ + توقيع لحظي) بدّل إلى Signed upload عبر وسيط خادمي
//  (Cloud Function) فلا يبقى أي مفتاح علني. هذا يتطلب نشر Functions — غير متاح حاليًا،
//  فالقيود أعلاه هي خط الدفاع الفعلي في النشر القائم.
//
// الإعداد أدناه يسمح بالتمرير عبر متغيرات بيئة لتسهيل التدوير دون تعديل الكود.
const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) || 'dzk4hgpq';
const UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined) || 'fiqh_preset';

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
export const CLOUDINARY_UPLOAD_PRESET = UPLOAD_PRESET;

// حد أقصى محلي للملف قبل الرفع (حماية أولية من سوء الاستخدام العرضي)
// يجب أن يطابق "Max file size" في إعداد الـ preset على Cloudinary.
const CLOUDINARY_MAX_FILE_BYTES = 25 * 1024 * 1024;

// يجب أن يطابق "Allowed formats" في إعداد الـ preset على Cloudinary.
const ALLOWED_UPLOAD_EXT = ['pdf', 'mp3', 'm4a', 'jpg', 'jpeg', 'png', 'webp'];

// ربط الامتداد بنوع MIME المتوقع — يقلّل (لا يمنع تمامًا) انتحال نوع الملف،
// إذ يمكن للعميل تزوير MIME، فالفرض النهائي يبقى على قيود Cloudinary.
const EXT_TO_MIME: Record<string, string[]> = {
  pdf: ['application/pdf'],
  mp3: ['audio/mpeg', 'audio/mp3'],
  m4a: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
};

export function validateUploadFile(file: File): string | null {
  if (file.size > CLOUDINARY_MAX_FILE_BYTES) {
    return `حجم الملف يتجاوز الحد المسموح (${Math.round(CLOUDINARY_MAX_FILE_BYTES / 1048576)}MB).`;
  }
  if (file.size === 0) {
    return 'الملف فارغ — لا يمكن رفع ملف بلا محتوى.';
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_UPLOAD_EXT.includes(ext)) {
    return `صيغة غير مدعومة (.${ext}) — المسموح: ${ALLOWED_UPLOAD_EXT.join(', ')}.`;
  }
  // فحص النوع إن توفّر: يمنع الحالات الواضحة (خطأ اختيار ملف)، دون رفض MIME الفارغ
  // لأن بعض المتصفحات/الأنظمة لا تُعبّئه (والت تبقى قيود Cloudinary هي الفاصل).
  const declared = (file.type || '').toLowerCase();
  if (declared && declared !== 'application/octet-stream') {
    const expected = EXT_TO_MIME[ext];
    if (expected && !expected.includes(declared)) {
      return `نوع الملف (${declared}) لا يطابق امتداده (.${ext}).`;
    }
  }
  return null;
}
