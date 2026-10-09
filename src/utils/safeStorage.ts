// وصول آمن للتخزين المحلي — getItem آمن غالبًا، لكن setItem يرمي عند امتلاء الحصة أو التصفح الخاص
// فينهار الريندر/التأثير كله؛ هذه الدوال لا ترمي أبدًا
export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // تجاهل — غياب الحذف لا يكسر شيئًا
  }
}

export function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw) as unknown;
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}
