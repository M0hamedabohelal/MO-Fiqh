// فحص اتصال فعلي بالشبكة.
// navigator.onLine غير موثوق في متصفحات أندرويد: قد يبقى false بعد عودة
// الشبكة (فيظن التطبيق أنه بلا إنترنت ويحجب كل المحاولات)، وقد يبقى true بلا إنترنت.
// طلب خفيف لا يُخزَّن هو الحكم الفعلي.
export async function probeOnline(timeoutMs = 4_000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await fetch('https://www.gstatic.com/generate_204', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    return true;
  } catch {
    return false;
  }
}
