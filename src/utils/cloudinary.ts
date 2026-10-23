// إعدادات Cloudinary لرفع المرفقات من لوحة الإدارة.
//
// ⚠️ أمني: `cloudName` و`uploadPreset` غير الموقّع **علنيان بطبيعتهما** — يُخبزان في حزمة
// العميل ولا يمكن إخفاؤهما كوديًا. الحماية الحقيقية على جانب Cloudinary:
//   1) اضبط الـ preset (Settings ← Upload ← Upload presets) على Unsigned مع قيود صريحة:
//      • Allowed formats: pdf,mp3,jpg,jpeg,png,webp فقط
//      • Max file size: حد معقول (مثل 25MB)
//      • Folder ثابت للمرفقات
//   2) للقفل الكامل: بدّل إلى Signed upload عبر وسيط خادمي (Cloud Function) — لا مفتاح علني.
// الإعداد أدناه يسمح بالتمرير عبر متغيرات بيئة لتسهيل التدوير دون تعديل الكود.
const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) || 'dzk4hgpq';
const UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined) || 'fiqh_preset';

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
export const CLOUDINARY_UPLOAD_PRESET = UPLOAD_PRESET;

// حد أقصى محلي للملف قبل الرفع (حماية أولية من سوء الاستخدام العرضي)
const CLOUDINARY_MAX_FILE_BYTES = 25 * 1024 * 1024;

const ALLOWED_UPLOAD_EXT = ['pdf', 'mp3', 'm4a', 'jpg', 'jpeg', 'png', 'webp'];

export function validateUploadFile(file: File): string | null {
  if (file.size > CLOUDINARY_MAX_FILE_BYTES) {
    return `حجم الملف يتجاوز الحد المسموح (${Math.round(CLOUDINARY_MAX_FILE_BYTES / 1048576)}MB).`;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_UPLOAD_EXT.includes(ext)) {
    return `صيغة غير مدعومة (.${ext}) — المسموح: ${ALLOWED_UPLOAD_EXT.join(', ')}.`;
  }
  return null;
}
