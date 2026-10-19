// تخزين الصوت أوفلاين في IndexedDB (كائنات Blob) — وليس Cache API
// السبب: الـ Service Worker يقدّم المخزّن كاستجابة كاملة (200) فتفشل كل طلبات المدى (Range)
// ويتعطّل القفز لموضع المسألة. الـ Blob يُبث محليًا بدعم مدى كامل فالقفز يعمل أوفلاين تمامًا.
import { safeGet, safeSet } from './safeStorage';

const DB_NAME = 'fqh-audio';
const STORE_NAME = 'files';
const CLEANUP_FLAG = 'audio_idb_cleanup_v1';
// سقف عدد الملفات المخزّنة محليًا — يمنع النمو غير المحدود حتى استنفاد حصة المتصفح.
// عند التجاوز يُحذف الأقدم وصولًا (بالطابع الزمني) حتى يشمل المتجر الجديد.
const MAX_ENTRIES = 40;

interface StoredAudio {
  blob: Blob;
  at: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('تعذّر فتح قاعدة الصوت.'));
    } catch (err) {
      reject(err);
    }
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        try {
          const transaction = db.transaction(STORE_NAME, mode);
          const store = transaction.objectStore(STORE_NAME);
          const req = run(store);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error || new Error('عملية تخزين فاشلة.'));
          transaction.oncomplete = () => db.close();
          transaction.onerror = () => db.close();
        } catch (err) {
          try { db.close(); } catch { /* تجاهل */ }
          reject(err);
        }
      }),
  );
}

// يحوّل أي قيمة مخزّنة إلى Blob، مع دعم الصيغة القديمة (Blob خام) والجديدة ({ blob, at })
function toBlob(value: unknown): Blob | null {
  if (value instanceof Blob) return value;
  if (value && typeof value === 'object' && (value as StoredAudio).blob instanceof Blob) {
    return (value as StoredAudio).blob;
  }
  return null;
}

export async function saveAudio(url: string, blob: Blob): Promise<void> {
  const entry: StoredAudio = { blob, at: Date.now() };
  await tx('readwrite', (store) => store.put(entry, url));
  await pruneAudioCache();
}

export async function loadAudio(url: string): Promise<Blob | null> {
  try {
    const result = await tx('readonly', (store) => store.get(url));
    return toBlob(result);
  } catch {
    return null;
  }
}

export async function removeAudio(url: string): Promise<void> {
  try {
    await tx('readwrite', (store) => store.delete(url));
  } catch { /* تجاهل */ }
}

// يقلّص المتجر إلى السقف بحذف الأقدم وصولًا (بالطابع الزمني) عند تجاوزه.
// الصيغة القديمة بلا طابع تُعامَل كالأقدم فتُحذف أولًا عند التجاوز.
export async function pruneAudioCache(max = MAX_ENTRIES): Promise<void> {
  try {
    const db = await openDb();
    const entries = await new Promise<Array<[string, unknown]>>((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const out: Array<[string, unknown]> = [];
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return;
          out.push([String(cursor.key), cursor.value]);
          cursor.continue();
        };
        transaction.oncomplete = () => { db.close(); resolve(out); };
        transaction.onerror = () => { db.close(); reject(transaction.error || new Error('فشل جرد التخزين.')); };
      } catch (err) {
        try { db.close(); } catch { /* تجاهل */ }
        reject(err);
      }
    });
    if (entries.length <= max) return;
    entries.sort((a, b) => toTimestamp(a[1]) - toTimestamp(b[1]));
    const toDelete = entries.slice(0, entries.length - max);
    for (const [key] of toDelete) {
      await tx('readwrite', (store) => store.delete(key));
    }
  } catch { /* التنظيف غير حرج */ }
}

function toTimestamp(value: unknown): number {
  if (value && typeof value === 'object' && typeof (value as StoredAudio).at === 'number') {
    return (value as StoredAudio).at;
  }
  return 0; // صيغة قديمة بلا طابع → الأقدم
}

// تنظيف لمرة واحدة: مخازن Cache API القديمة التي كانت تكسر القفز + أعلامها
export async function cleanupLegacyAudioCache(): Promise<void> {
  try {
    if (safeGet(CLEANUP_FLAG) === '1') return;
    if ('caches' in window) {
      await Promise.all([
        caches.delete('lesson-audio').catch(() => false),
        caches.delete('fqh-audio-v1').catch(() => false),
      ]);
    }
    safeSet(CLEANUP_FLAG, '1');
  } catch { /* تجاهل */ }
}
