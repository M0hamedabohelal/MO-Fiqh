// ─── أنواع الخطأ الموحدة ───
// كل فشل في التطبيق يُصنَّف إلى واحدة من هذه العائلات، ولكل عائلة شاشة/بطاقة واحدة
// (انظر docs/error-design.md). الفائدة: نص واحد صحيح لكل حالة، وإمكانية اختبارها آليًا.

export type ErrorKind =
  | 'render'      // استثناء تصيير — ErrorBoundary (شاشة كاملة)
  | 'network'     // فشل شبكة عام (Firestore/webrequest غير متاح)
  | 'timeout'     // انتهى وقت الانتظار
  | 'offline'     // لا اتصال
  | 'notfound'    // رابط/معرّف غير موجود (404 دلالي أو soft-404)
  | 'stale'       // نسخة قديمة بعد نشر جديد (chunk 404)
  | 'permission'  // صلاحية مرفوضة (قواعد Firestore / مشرف)
  | 'quota'       // تجاوز حصة/حد استخدام
  | 'unknown';    // ما لم نستطع تصنيفه

export interface ErrorPresentation {
  kind: ErrorKind;
  /** عنوان قصير جدًا — يُستخدم كعنوان بطاقة أو سطر toast */
  title: string;
  /** شرح بشرحي: ماذا حدث + لماذا + ماذا تفعل */
  message: string;
  /** نص زر الإجراء الرئيسي (null = لا إجراء) */
  actionLabel: string | null;
  /** هل من المجدي إعادة المحاولة؟ */
  retryable: boolean;
  /** مستوى العرض المقصود */
  surface: 'screen' | 'card' | 'toast' | 'banner';
  /** رمز الحادثة err_xxxxxxxx الذي يُسجَّل ويُعرض للمستخدم */
  incidentId: string | null;
}

export interface ErrorContext {
  /** مفتاح العملية للسياق (lessons.load، clipboard.copy ...) */
  scope?: string;
  /** عنوان مخصص يتقدّم على العنوان الافتراضي للعائلة */
  title?: string;
  /** تفصيل إضافي (يُدمج مع الرسالة الافتراضية) */
  detail?: string;
  /** هل نحن بلا اتصال فعليًا (يُقدَّم على تصنيف network) */
  offline?: boolean;
  /** رمز حادثة جاهز (يُمرَّر من الحدود) */
  incidentId?: string;
}
