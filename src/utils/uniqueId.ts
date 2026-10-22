// مولّد معرّفات فريد — يمنع تصادم Date.now() الوحيد (فائدتان في نفس المللي ثانية
// كانتا تتشاركان المعرّف فيُدمجان ويفقد إحداهما).
// المعرّف نصّي: آمن كـ React key، ومتوافق مع المقارنات String(id) في كل المشروع.
let seq = 0;

export function createUniqueId(prefix = 'hl'): string {
  // crypto.randomUUID متاح في كل المتصفحات الحديثة والسياق الآمن (https)
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    /* السقوط للبديل */
  }
  // بديل: زمن + تسلسل + عشوائي — فريد حتى في نفس المللي ثانية
  seq = (seq + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
