// ─── تنبيه «تسجيل الدخول للمزامنة» ───
//
// القراءة والحفظ المحلي متاحان للجميع (زائر أو مسجّل). يُحفظ عمل الزائر محليًا على جهازه،
// ويُنصح بتسجيل الدخول لمزامنة مكتبته (المفضلة، الملاحظات، الفوائد، علامات الوقف)
// بين أجهزته وحمايتها من الضياع عند مسح بيانات المتصفح.
//
// التصميم: قناة أحداث صغيرة بدل تمرير callbacks عبر عشرات المكوّنات.
// أي طبقة (hook) تنادي requireLogin()، فيظهر بوب أسفل الشاشة مع زر «تسجيل الدخول».
// لا يعتمد على React context حتى يعمل من داخل الـ hooks بدون تمرير props.

export interface GuestPromptDetail {
  /** ما الذي حاول المستخدم حفظه — يظهر في النص: «سجّل الدخول لحفظ المفضلة» */
  action?: string;
  /** نص مخصّص يتجاوز الافتراضي */
  message?: string;
  /** عملية معلقة لإعادة تنفيذها تلقائيًا بعد نجاح تسجيل الدخول */
  retry?: () => void;
}

const EVENT = 'fqh:require-login';

let lastPromptAt = 0;
let lastAction = '';
let pendingRetry: (() => void) | null = null;
// خانق قصير لنفس الإجراء لمنع النقر العشوائي المزدوج (400ms بدل 1200ms)
const THROTTLE_MS = 400;

/** تسجيل عملية معلقة للتنفيذ بعد تسجيل الدخول */
export function setPendingAction(fn: (() => void) | null): void {
  pendingRetry = fn;
}

/** تنفيذ العملية المعلقة بعد نجاح تسجيل الدخول */
export function executePendingAction(): void {
  if (pendingRetry) {
    const fn = pendingRetry;
    pendingRetry = null;
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

/** مسح العملية المعلقة */
export function clearPendingAction(): void {
  pendingRetry = null;
}

/** ينادي البوب. يُظهر التنبيه فورًا لو كان إجراءً مختلفًا، ويخنق النقر المزدوج على نفس الزر */
export function requireLogin(detail: GuestPromptDetail = {}): void {
  const now = Date.now();
  const action = detail.action ?? '';
  // إذا كان نفس الإجراء مكررًا خلال نافذة الخانق، نتجاهله
  if (action === lastAction && now - lastPromptAt < THROTTLE_MS) return;
  lastPromptAt = now;
  lastAction = action;

  if (typeof detail.retry === 'function') {
    setPendingAction(detail.retry);
  }

  try {
    window.dispatchEvent(new CustomEvent<GuestPromptDetail>(EVENT, { detail }));
  } catch {
    // بلا window (SSR/اختبار): لا شيء نفعله
  }
}

/** يستمع للطلبات — يستخدمه GuestLoginPrompt */
export function onRequireLogin(handler: (detail: GuestPromptDetail) => void): () => void {
  const listener = (event: Event): void => {
    handler((event as CustomEvent<GuestPromptDetail>).detail ?? {});
  };
  try {
    window.addEventListener(EVENT, listener);
  } catch {
    return () => {};
  }
  return () => {
    try { window.removeEventListener(EVENT, listener); } catch { /* ignore */ }
  };
}

// للاختبارات: لا throttle بين الحالات
export function __resetGuestPromptForTests(): void {
  lastPromptAt = 0;
  lastAction = '';
  pendingRetry = null;
}
