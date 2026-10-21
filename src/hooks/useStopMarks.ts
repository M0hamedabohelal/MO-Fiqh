import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lesson } from '../types';
import { useAuth } from '../Components/Auth/AuthContext';
import { safeGet, safeSet } from '../utils/safeStorage';
import { logError } from '../utils/logError';
import { subscribeToStopMarks, writeStopMark } from '../firebase/stopMarks';
import {
  compareStopMarks,
  createStopMarkChange,
  createRestoredStopMarks,
  mergeStopMarkMaps,
  normalizeStopMarkMap,
} from '../features/stopMarks/model';
import type { StopMarkMap, StopMarkRecord } from '../features/stopMarks/model';

export type StopMarksSyncState = 'loading' | 'local' | 'pending' | 'synced' | 'error';

const guestStorageKey = 'guest_stopMarks_v2';
const accountStorageKey = (uid: string): string => `stopMarks_v2_${uid}`;
const deviceStorageKey = 'stopMarks_deviceId_v2';

function readStoredMarks(key: string): StopMarkMap {
  try {
    return normalizeStopMarkMap(JSON.parse(safeGet(key) || '{}'));
  } catch {
    return {};
  }
}

function getDeviceId(): string {
  const existing = safeGet(deviceStorageKey);
  if (existing) return existing;
  const created = globalThis.crypto?.randomUUID?.()
    ?? `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  safeSet(deviceStorageKey, created);
  return created;
}

export function useStopMarks() {
  const { user, authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const [marks, setMarks] = useState<StopMarkMap>({});
  const [loadedUid, setLoadedUid] = useState<string | null | undefined>(undefined);
  const [syncState, setSyncState] = useState<StopMarksSyncState>('loading');
  const [lastSyncRecord, setLastSyncRecord] = useState<{ uid: string; at: number } | null>(null);
  const marksRef = useRef<StopMarkMap>({});
  const activeUidRef = useRef<string | null>(uid);
  const pendingRecordsRef = useRef(new Map<string, StopMarkRecord>());
  const pendingTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const syncTimedOutRef = useRef(false);
  const deviceIdRef = useRef('');

  const persistLocal = useCallback((next: StopMarkMap, currentUid: string | null) => {
    marksRef.current = next;
    setMarks(next);
    safeSet(currentUid ? accountStorageKey(currentUid) : guestStorageKey, JSON.stringify(next));
  }, []);

  const persistCloudRecord = useCallback((currentUid: string, bookKey: string, record: StopMarkRecord) => {
    pendingRecordsRef.current.set(bookKey, record);
    syncTimedOutRef.current = false;
    setSyncState('pending');
    const oldTimeout = pendingTimeoutsRef.current.get(bookKey);
    if (oldTimeout) clearTimeout(oldTimeout);
    const timeout = setTimeout(() => {
      if (pendingRecordsRef.current.get(bookKey) !== record) return;
      pendingTimeoutsRef.current.delete(bookKey);
      if (activeUidRef.current === currentUid) {
        syncTimedOutRef.current = true;
        setSyncState('error');
      }
    }, 20_000);
    pendingTimeoutsRef.current.set(bookKey, timeout);
    void writeStopMark(currentUid, bookKey, record)
      .then(() => {
        clearTimeout(timeout);
        if (pendingTimeoutsRef.current.get(bookKey) === timeout) pendingTimeoutsRef.current.delete(bookKey);
        if (activeUidRef.current !== currentUid) return;
        // كتابة الكاش المحلي (Firestore offline persistence) تُحل فورًا حتى بلا شبكة،
        // فلا نعلن "synced" إلا عند طلب الخادم فعليًا؛ وإلا بقي سجل العلامة غير مُرسل.
        if (!window.navigator.onLine) {
          syncTimedOutRef.current = false;
          setSyncState('pending');
          return;
        }
        if (pendingRecordsRef.current.get(bookKey) === record) pendingRecordsRef.current.delete(bookKey);
        if (pendingRecordsRef.current.size === 0) {
          syncTimedOutRef.current = false;
          setSyncState('synced');
          setLastSyncRecord({ uid: currentUid, at: Date.now() });
        }
      })
      .catch((error: unknown) => {
        clearTimeout(timeout);
        if (pendingTimeoutsRef.current.get(bookKey) === timeout) pendingTimeoutsRef.current.delete(bookKey);
        if (activeUidRef.current !== currentUid) return;
        logError('stopMarks.write', error);
        syncTimedOutRef.current = window.navigator.onLine;
        setSyncState(window.navigator.onLine ? 'error' : 'pending');
      });
  }, []);

  const retryStopMarkSync = useCallback(() => {
    const currentUid = activeUidRef.current;
    if (!currentUid || !window.navigator.onLine) return;
    syncTimedOutRef.current = false;
    pendingRecordsRef.current.forEach((record, bookKey) => persistCloudRecord(currentUid, bookKey, record));
  }, [persistCloudRecord]);

  // يحمّل هذا الأثر مخزن الحساب بعد استقرار المصادقة، لذا تحديث الحالة هنا هو مزامنة التخزين المحلي المقصودة.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (authLoading) return undefined;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const pendingTimeouts = pendingTimeoutsRef.current;
    activeUidRef.current = uid;
    pendingTimeouts.forEach((timeout) => clearTimeout(timeout));
    pendingTimeouts.clear();
    pendingRecordsRef.current.clear();
    syncTimedOutRef.current = false;

    const storedMarks = readStoredMarks(uid ? accountStorageKey(uid) : guestStorageKey);
    persistLocal(storedMarks, uid);

    if (!uid) {
      setLoadedUid(null);
      setSyncState('local');
      return () => { cancelled = true; };
    }

    setSyncState('loading');
    void subscribeToStopMarks(uid, (cloudDocuments, metadata) => {
      if (cancelled || activeUidRef.current !== uid) return;
      const normalizedCloud = normalizeStopMarkMap(cloudDocuments);
      const current = marksRef.current;
      const merged = mergeStopMarkMaps(current, normalizedCloud);
      persistLocal(merged, uid);
      setLoadedUid(uid);
      if (metadata.hasPendingWrites || pendingRecordsRef.current.size > 0) {
        setSyncState(syncTimedOutRef.current ? 'error' : 'pending');
      }
      else if (metadata.fromCache) setSyncState('local');
      else {
        setSyncState('synced');
        setLastSyncRecord({ uid, at: Date.now() });
      }

      // جهاز رجع من عدم الاتصال قد يحمل سجلًا أحدث من السحابة؛ أعد رفع الفائز نفسه.
      Object.entries(current).forEach(([bookKey, localRecord]) => {
        const cloudRecord = normalizedCloud[bookKey];
        if (!cloudRecord || compareStopMarks(localRecord, cloudRecord) > 0) {
          persistCloudRecord(uid, bookKey, localRecord);
        }
      });
    }, (error) => {
      if (cancelled || activeUidRef.current !== uid) return;
      logError('stopMarks.listen', error);
      setSyncState('error');
    }).then((stopListening) => {
      if (cancelled) stopListening();
      else unsubscribe = stopListening;
    }).catch((error: unknown) => {
      if (cancelled || activeUidRef.current !== uid) return;
      logError('stopMarks.listen', error);
      setSyncState('error');
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      pendingTimeouts.forEach((timeout) => clearTimeout(timeout));
      pendingTimeouts.clear();
    };
  }, [authLoading, uid, persistCloudRecord, persistLocal]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const retryPendingWrites = () => retryStopMarkSync();
    window.addEventListener('online', retryPendingWrites);
    return () => window.removeEventListener('online', retryPendingWrites);
  }, [retryStopMarkSync]);

  const toggleStopMark = useCallback((lesson: Lesson) => {
    if (authLoading || activeUidRef.current !== uid) return;
    if (!deviceIdRef.current) deviceIdRef.current = getDeviceId();
    const change = createStopMarkChange(marksRef.current, lesson, deviceIdRef.current);
    if (!change) return;
    const next = { ...marksRef.current, [change.bookKey]: change.record };
    persistLocal(next, uid);
    if (uid) persistCloudRecord(uid, change.bookKey, change.record);
    else setSyncState('local');
  }, [authLoading, uid, persistCloudRecord, persistLocal]);

  const restoreStopMarks = useCallback((restored: unknown) => {
    if (authLoading || activeUidRef.current !== uid) return;
    if (!deviceIdRef.current) deviceIdRef.current = getDeviceId();
    const incoming = normalizeStopMarkMap(restored);
    const merged = createRestoredStopMarks(marksRef.current, incoming, deviceIdRef.current);
    persistLocal(merged, uid);
    if (uid) {
      Object.entries(merged).forEach(([bookKey, record]) => {
        if (incoming[bookKey] && record.deviceId === deviceIdRef.current) persistCloudRecord(uid, bookKey, record);
      });
    } else {
      setSyncState('local');
    }
  }, [authLoading, uid, persistCloudRecord, persistLocal]);

  return {
    stopMarks: marks,
    stopMarksReady: loadedUid === uid,
    stopMarksSyncState: syncState,
    stopMarksLastSyncedAt: lastSyncRecord?.uid === uid ? lastSyncRecord.at : null,
    retryStopMarkSync,
    toggleStopMark,
    restoreStopMarks,
  };
}
