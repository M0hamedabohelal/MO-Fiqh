/**
 * أدوات الاهتزاز اللمسي الذكي (Haptic Feedback)
 * تمنح المستخدم شعوراً فائق السلاسة يشبه التطبيقات الأصلية على الجوال (Native App Feel)
 * آمنة تماماً وتتجاهل بهدوء أي بيئة لا تدعم الـ Vibration API.
 */
export type HapticStyle = 'selection' | 'light' | 'medium' | 'success' | 'warning';

export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') return;

  try {
    switch (style) {
      case 'selection':
        // نقرة خفيفة جداً وسريعة (8ms) عند التنقل بين التبويبات أو التمرير في القوائم
        navigator.vibrate(8);
        break;
      case 'light':
        // لمسة خفيفة (12ms) عند النقر على الأزرار وعناصر التحكم
        navigator.vibrate(12);
        break;
      case 'medium':
        // لمسة متوسطة (20ms) عند إتمام إيماءات السحب (Swipe Threshold)
        navigator.vibrate(20);
        break;
      case 'success':
        // نبضتان ناعمتان عند حفظ الفائدة أو وضع علامة الوقوف
        navigator.vibrate([12, 40, 16]);
        break;
      case 'warning':
        navigator.vibrate([25, 40, 25]);
        break;
      default:
        navigator.vibrate(10);
    }
  } catch {
    // تجاهل أية قيود من المتصفح بأمان
  }
}
