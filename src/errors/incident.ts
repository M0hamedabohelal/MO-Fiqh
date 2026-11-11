// ─── رمز الحادثة + سجل الجلسة ───
// الغرض: المستخدم يقرأ رمزًا قصيرًا (err_3f9a1c2b) ويقوله، والمطوّر يجده في client_errors
// أو في sessionStorage. بدون هذا يصير «حدث خطأ» بلا أثر قابل للتتبع.

const RING_KEY = 'fiqh:error:ring';
const LAST_KEY = 'fiqh:error:last';
const MAX_EVENTS = 30;

export interface IncidentEvent {
  id: string;
  kind: string;
  scope: string;
  message: string;
  at: number;
  url: string;
}

/** معرّف حادثة قصير وقابل للقراءة — 8 hex (≈4 مليار احتمال) */
export function createIncidentId(): string {
  const bytes = new Uint8Array(4);
  try {
    (globalThis.crypto as Crypto).getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return `err_${hex}`;
}

export function isValidIncidentId(id: unknown): id is string {
  return typeof id === 'string' && /^err_[0-9a-f]{8}$/.test(id);
}

/**
 * يُسجّل حدثًا في حلقة الجلسة (آخر 30) ويجعله «آخر خطأ».
 * كتابة sessionStorage محمية: وضع خاص/ Safari قد يرمي عند التجاوز.
 */
export function recordIncident(event: Omit<IncidentEvent, 'at' | 'url'>): void {
  const entry: IncidentEvent = { ...event, at: Date.now(), url: safeUrl() };
  try {
    const raw = sessionStorage.getItem(RING_KEY);
    const list: IncidentEvent[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    while (list.length > MAX_EVENTS) list.shift();
    sessionStorage.setItem(RING_KEY, JSON.stringify(list));
    sessionStorage.setItem(LAST_KEY, JSON.stringify(entry));
  } catch {
    /* لا نكسر التطبيق من أجل سجل تشخيص */
  }
}

export function readIncidentRing(): IncidentEvent[] {
  try {
    const raw = sessionStorage.getItem(RING_KEY);
    return raw ? (JSON.parse(raw) as IncidentEvent[]) : [];
  } catch {
    return [];
  }
}

export function readLastIncident(): IncidentEvent | null {
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as IncidentEvent) : null;
  } catch {
    return null;
  }
}

function safeUrl(): string {
  try {
    return location.href;
  } catch {
    return '';
  }
}
