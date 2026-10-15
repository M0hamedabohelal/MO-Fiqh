// تخزين الصوت أوفلاين في IndexedDB (كائنات Blob) — وليس Cache API
// السبب: الـ Service Worker يقدّم المخزّن كاستجابة كاملة (200) فتفشل كل طلبات المدى (Range)
// ويتعطّل القفز لموضع المسألة. الـ Blob يُبث محليًا بدعم مدى كامل فالقفز يعمل أوفلاين تمامًا.
const DB_NAME = 'fqh-audio';
const STORE_NAME = 'files';
const CLEANUP_FLAG = 'audio_idb_cleanup_v1';

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

export async function saveAudio(url: string, blob: Blob): Promise<void> {
  await tx('readwrite', (store) => store.put(blob, url));
}

export async function loadAudio(url: string): Promise<Blob | null> {
  try {
    const result = await tx('readonly', (store) => store.get(url));
    return result instanceof Blob ? result : null;
  } catch {
    return null;
  }
}

export async function removeAudio(url: string): Promise<void> {
  try {
    await tx('readwrite', (store) => store.delete(url));
  } catch { /* تجاهل */ }
}

// تنظيف لمرة واحدة: مخازن Cache API القديمة التي كانت تكسر القفز + أعلامها
export async function cleanupLegacyAudioCache(): Promise<void> {
  try {
    if (localStorage.getItem(CLEANUP_FLAG) === '1') return;
    if ('caches' in window) {
      await Promise.all([
        caches.delete('lesson-audio').catch(() => false),
        caches.delete('fqh-audio-v1').catch(() => false),
      ]);
    }
    try { localStorage.setItem(CLEANUP_FLAG, '1'); } catch { /* تجاهل */ }
  } catch { /* تجاهل */ }
}
