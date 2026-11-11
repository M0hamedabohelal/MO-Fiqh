// ─── تصنيف الأخطاء → عرض جاهز ───
// مدخل واحد: أي شيء (unknown) ← مخرج واحد: ErrorPresentation.
// لا تستدعِ نصوصًا في المكوّنات؛ كل النصوص هنا حتى تبقى موحّدة وقابلة للاختبار.
import type { ErrorContext, ErrorKind, ErrorPresentation } from './types';
import { createIncidentId } from './incident';

interface ClassifyResult {
  kind: ErrorKind;
  retryable: boolean;
  surface: ErrorPresentation['surface'];
  actionLabel: string | null;
}

const CODE_TEXT = (err: unknown): string => {
  if (!err) return '';
  if (typeof err === 'string') return err;
  const e = err as { code?: unknown; name?: unknown; message?: unknown };
  const parts = [
    typeof e.code === 'string' ? e.code : '',
    typeof e.name === 'string' ? e.name : '',
    typeof e.message === 'string' ? e.message : String(err),
  ];
  return parts.join(' ');
};

const NETWORK_RE = /failed to fetch|networkerror|network error|err_internet|err_network|unavailable|offline|load failed|fetch failed|request failed/i;
const TIMEOUT_RE = /timeout|timed out|deadline|abort/i;
const PERMISSION_RE = /permission-denied|insufficient permissions|missing or insufficient/i;
const QUOTA_RE = /quota|resource-exhausted|too many requests|429/i;
const NOTFOUND_RE = /not-found|not found|404|does not exist|غير موجود/i;
const STALE_RE = /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|loading css chunk|loading chunk/i;

/**
 * يصنّف خطأً خامًا. المصدر أولًا (code/name/message)، ثم سياق الاتصال.
 * القاعدة: الأخصّ يفوز — stale قبل network، offline قبل network، permission قبل notfound.
 */
export function classifyError(err: unknown, ctx: ErrorContext = {}): ClassifyResult {
  const text = CODE_TEXT(err);

  if (STALE_RE.test(text)) {
    return { kind: 'stale', retryable: true, surface: 'banner', actionLabel: 'تحديث الآن' };
  }
  if (ctx.offline || /^offline$/i.test((err as { code?: string })?.code ?? '') || /offline/i.test(text)) {
    return { kind: 'offline', retryable: true, surface: 'banner', actionLabel: 'إعادة المحاولة' };
  }
  if (PERMISSION_RE.test(text)) {
    return { kind: 'permission', retryable: false, surface: 'card', actionLabel: 'رجوع' };
  }
  if (QUOTA_RE.test(text)) {
    return { kind: 'quota', retryable: true, surface: 'card', actionLabel: 'إعادة المحاولة' };
  }
  if (NOTFOUND_RE.test(text)) {
    return { kind: 'notfound', retryable: false, surface: 'card', actionLabel: 'فهرس المسائل' };
  }
  if (TIMEOUT_RE.test(text)) {
    return { kind: 'timeout', retryable: true, surface: 'card', actionLabel: 'إعادة المحاولة' };
  }
  if (NETWORK_RE.test(text)) {
    return { kind: 'network', retryable: true, surface: 'card', actionLabel: 'إعادة المحاولة' };
  }
  return { kind: 'unknown', retryable: true, surface: 'toast', actionLabel: null };
}

const PRESETS: Record<ErrorKind, { title: string; message: string; retryable?: boolean }> = {
  render: {
    title: 'تعذّر عرض هذه الشاشة',
    message: 'قد يكون الموقع حُدّث للتو أو انقطع الاتصال لحظة التحميل. المحاولة أولًا عادةً تكفي.',
  },
  network: {
    title: 'تعذّر تحميل المحتوى',
    message: 'لم يصل الرد من الخادم. تحقّق من الاتصال ثم أعد المحاولة.',
  },
  timeout: {
    title: 'التزم الاتصال وقتًا طويلًا',
    message: 'الشبكة بطيئة في هذه اللحظة. أعد المحاولة، وإن تكرر افتح المسألة المحفوظة أوفلاين.',
  },
  offline: {
    title: 'أنت غير متصل',
    message: 'القراءة المحفوظة تعمل، والتغييرات ستُزامَن عند عودة الاتصال.',
  },
  notfound: {
    title: 'الرابط غير صحيح',
    message: 'تقدم هذه الصفحة غير متوفرة أو أن رابط المشاركة قديم — يمكنك البدء من فهرس المسائل.',
  },
  stale: {
    title: 'نسخة جديدة متاحة',
    message: 'حُدّث الموقع، وأنت على نسخة سابقة — حدّث لتظهر آخر التعديلات.',
  },
  permission: {
    title: 'ليست لديك صلاحية لهذا الإجراء',
    message: 'يحتاج هذا الإجراء إلى حساب مُصرَّح. سجّل الدخول بحساب يملك الصلاحية ثم أعد المحاولة.',
  },
  quota: {
    title: 'تم بلوغ الحد مؤقتًا',
    message: 'الخدمة استلمت طلبات كثيرة الآن. انتظر قليلًا ثم أعد المحاولة.',
  },
  unknown: {
    title: 'حدث خطأ غير متوقع',
    message: 'لم نتمكن من إكمال العملية. أعد المحاولة، وإن تكرر أبلغنا برمز الحادثة.',
  },
};

/**
 * يحوّل أي خطأ إلى عرض كامل (عنوان/رسالة/إجراء/رمز حادثة).
 * incidentId: يُمرَّر إن كان معلومًا (من ErrorBoundary) وإلا يُنشأ جديد.
 */
export function mapError(err: unknown, ctx: ErrorContext = {}): ErrorPresentation {
  const c = classifyError(err, ctx);
  const preset = PRESETS[c.kind];
  const message = ctx.detail ? `${preset.message} ${ctx.detail}` : preset.message;
  return {
    kind: c.kind,
    title: ctx.title || preset.title,
    message,
    actionLabel: c.actionLabel,
    retryable: c.retryable,
    surface: c.surface,
    incidentId: ctx.incidentId || createIncidentId(),
  };
}

/** عرض قصير لـtoast (سطر واحد لا أكثر) */
export function mapErrorToToast(err: unknown, ctx: ErrorContext = {}): string {
  const p = mapError(err, ctx);
  return p.kind === 'unknown' ? `${p.message} (${p.incidentId})` : p.message;
}
