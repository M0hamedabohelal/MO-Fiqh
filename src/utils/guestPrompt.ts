// ─── تحذير «يلزم تسجيل الدخول» ───
//
// القراءة حرة للجميع (زائر أو مسجّل) — الحفظ وحده يتطلب حسابًا، لأن البيانات
// تتزامن بين الأجهزة ولا معنى لحفظ مجهول لا يمكن استرجاعه.
//
// التصميم: قناة أحداث صغيرة بدل تمرير callbacks عبر عشرات المكوّنات.
// أي طبقة (hook) تنادي requireLogin()، فيظهر بوب أسفل الشاشة مع زر «تسجيل الدخول».
// لا يعتمد على React context حتى يعمل من داخل الـ hooks بدون تمرير props.

export interface GuestPromptDetail {
  /** ما الذي حاول المستخدم حفظه — يظهر في النص: «سجّل الدخول لحفظ المفضلة» */
  action?: string;
  /** نص مخصّص يتجاوز الافتراضي */
  message?: string;
}

const EVENT = 'fqh:require-login';

let lastPromptAt = 0;
// لا نُغرق المستخدم: ضغطات متتالية بنفس النية تُظهر بوبًا واحدًا
const THROTTLE_MS = 1200;

/** ينادي البوب. throttled لأن ضغط زر المفضلة سريعًا لا يعني تحذيرين. */
export function requireLogin(detail: GuestPromptDetail = {}): void {
  const now = Date.now();
  if (now - lastPromptAt < THROTTLE_MS) return;
  lastPromptAt = now;
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
}
