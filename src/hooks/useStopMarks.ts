import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lesson } from '../types';
import { useAuth } from '../Components/Auth/AuthContext';
import { safeGet, safeSet } from '../utils/safeStorage';
import { requireLogin } from '../utils/guestPrompt';
import {
  createStopMarkChange,
  createRestoredStopMarks,
  normalizeStopMarkMap,
  mergeStopMarkMaps,
} from '../features/stopMarks/model';
import type { StopMarkMap } from '../features/stopMarks/model';

// علامة الوقوف — محلية فقط (بدون أي مزامنة سحابية).
// سجل واحد لكل كتاب يُحفظ في localStorage، معزول لكل حساب ولكل ضيف.

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
  const marksRef = useRef<StopMarkMap>({});
  const deviceIdRef = useRef('');

  const persist = useCallback((next: StopMarkMap, currentUid: string | null) => {
    marksRef.current = next;
    setMarks(next);
    safeSet(currentUid ? accountStorageKey(currentUid) : guestStorageKey, JSON.stringify(next));
  }, []);

  // تحميل علامات الحساب/الضيف من localStorage عند استقرار المصادقة
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (authLoading) return;
    const currentUid = uid;
    if (!currentUid) {
      const guestMarks = readStoredMarks(guestStorageKey);
      persist(guestMarks, null);
      setLoadedUid(null);
      return;
    }
    // ترحيل علامات الضيف إلى الحساب عند أول دخول (مرة واحدة)
    const guestMarks = readStoredMarks(guestStorageKey);
    const accountMarks = readStoredMarks(accountStorageKey(currentUid));
    const merged = Object.keys(guestMarks).length > 0
      ? mergeStopMarkMaps(accountMarks, guestMarks)
      : accountMarks;
    persist(merged, currentUid);
    setLoadedUid(currentUid);
  }, [authLoading, uid, persist]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleStopMark = useCallback((lesson: Lesson) => {
    if (authLoading) return;
    if (!deviceIdRef.current) deviceIdRef.current = getDeviceId();
    const change = createStopMarkChange(marksRef.current, lesson, deviceIdRef.current);
    if (!change) return;
    // حارس الزائر: إضافة/تعديل علامة يتطلب حسابًا. الإزالة (lessonId=null) مسموحة دائمًا.
    const isRemoval = change.record.lessonId === null;
    if (!uid && !isRemoval) {
      requireLogin({ action: 'علامة الوقف' });
      return;
    }
    persist({ ...marksRef.current, [change.bookKey]: change.record }, uid);
  }, [authLoading, uid, persist]);

  const restoreStopMarks = useCallback((restored: unknown) => {
    if (authLoading) return;
    if (!deviceIdRef.current) deviceIdRef.current = getDeviceId();
    const incoming = normalizeStopMarkMap(restored);
    persist(createRestoredStopMarks(marksRef.current, incoming, deviceIdRef.current), uid);
  }, [authLoading, uid, persist]);

  return {
    stopMarks: marks,
    stopMarksReady: loadedUid === uid,
    toggleStopMark,
    restoreStopMarks,
  };
}
