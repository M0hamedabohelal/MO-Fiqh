import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../Components/Auth/AuthContext';
import { safeGet, safeSet, safeRemove } from '../utils/safeStorage';
import { requireLogin } from '../utils/guestPrompt';
import type { HighlightItem } from '../types';

// مكتبة المستخدم — محلية فقط (بدون أي مزامنة سحابية).
// المفضلة والفوائد والملاحظات والمسائل المقروءة تُحفظ في localStorage،
// معزولة لكل حساب ولكل ضيف. لا رفع ولا دمج سحابي ولا شواهد حذف.

interface LibrarySnapshot {
  bookmarks: string[];
  highlights: HighlightItem[];
  notes: Record<string, string>;
  readLessons: string[];
}

const emptySnapshot = (): LibrarySnapshot => ({ bookmarks: [], highlights: [], notes: {}, readLessons: [] });

const GUEST_KEYS = {
  bookmarks: 'guest_bookmarks',
  highlights: 'guest_highlights',
  notes: 'guest_notes',
  readLessons: 'guest_readLessons',
} as const;

const accountKey = (uid: string): string => `library_local_v1_${uid}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = safeGet(key);
    if (!raw) return fallback;
    return (JSON.parse(raw) ?? fallback) as T;
  } catch {
    return fallback;
  }
}

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

function normalize(value: unknown): LibrarySnapshot {
  const parsed = (value && typeof value === 'object' ? value : {}) as Partial<LibrarySnapshot>;
  return {
    bookmarks: asStrings(parsed.bookmarks),
    highlights: Array.isArray(parsed.highlights) ? (parsed.highlights as HighlightItem[]) : [],
    notes: parsed.notes && typeof parsed.notes === 'object' ? (parsed.notes as Record<string, string>) : {},
    readLessons: asStrings(parsed.readLessons),
  };
}

function readGuest(): LibrarySnapshot {
  return {
    bookmarks: asStrings(readJson<unknown>(GUEST_KEYS.bookmarks, [])),
    highlights: readJson<HighlightItem[]>(GUEST_KEYS.highlights, []),
    notes: readJson<Record<string, string>>(GUEST_KEYS.notes, {}),
    readLessons: asStrings(readJson<unknown>(GUEST_KEYS.readLessons, [])),
  };
}

function readAccount(uid: string): LibrarySnapshot {
  return normalize(readJson<unknown>(accountKey(uid), null));
}

function saveGuest(snapshot: LibrarySnapshot): void {
  safeSet(GUEST_KEYS.bookmarks, JSON.stringify(snapshot.bookmarks));
  safeSet(GUEST_KEYS.highlights, JSON.stringify(snapshot.highlights));
  safeSet(GUEST_KEYS.notes, JSON.stringify(snapshot.notes));
  safeSet(GUEST_KEYS.readLessons, JSON.stringify(snapshot.readLessons));
}

// اتحاد محلي عند أول دخول: لا يفقد الضيف ما جمعه قبل إنشاء الحساب.
function unionLibrary(a: LibrarySnapshot, b: LibrarySnapshot): LibrarySnapshot {
  const highlightMap = new Map<string, HighlightItem>();
  [...a.highlights, ...b.highlights].forEach((h) => {
    if (h) highlightMap.set(String(h.id ?? h.text), h);
  });

  // دمج الملاحظات بأمان دون فقدان أي نص في حال وجود ملاحظة في كليهما لنفس المسألة
  const notes: Record<string, string> = { ...a.notes };
  for (const [id, bText] of Object.entries(b.notes || {})) {
    if (!bText || !bText.trim()) continue;
    const aText = notes[id];
    if (!aText || !aText.trim()) {
      notes[id] = bText.trim();
    } else if (aText.trim() !== bText.trim()) {
      if (!aText.includes(bText.trim())) {
        const mergedText = `${aText.trim()}\n\n[ملاحظة سابقة]: ${bText.trim()}`;
        notes[id] = mergedText.length > 3_000 ? mergedText.slice(0, 3_000) : mergedText;
      }
    }
  }

  return {
    bookmarks: Array.from(new Set([...a.bookmarks, ...b.bookmarks])),
    highlights: Array.from(highlightMap.values()),
    notes,
    readLessons: Array.from(new Set([...a.readLessons, ...b.readLessons])),
  };
}

export function useUserLibrary() {
  const { user, authLoading } = useAuth();

  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(emptySnapshot);
  const [loadedUid, setLoadedUid] = useState<string | null | undefined>(undefined);
  const loadedUidRef = useRef<string | null | undefined>(undefined);
  const snapshotRef = useRef<LibrarySnapshot>(emptySnapshot());
  const loaded = useRef(false);

  // الحفظ الفوري المباشر: يمنع أي سباق زمني بين حالة React والتخزين المحلي
  const persistStorage = useCallback((next: LibrarySnapshot, targetUid: string | null) => {
    if (targetUid === null) saveGuest(next);
    else safeSet(accountKey(targetUid), JSON.stringify(next));
  }, []);

  const commit = useCallback((next: LibrarySnapshot, targetUid?: string | null) => {
    snapshotRef.current = next;
    setSnapshot(next);
    const activeUid = targetUid !== undefined ? targetUid : loadedUidRef.current;
    if (loaded.current && activeUid !== undefined) {
      persistStorage(next, activeUid);
    }
  }, [persistStorage]);

  // تحميل المخزن المحلي عند استقرار المصادقة وعند تغيّر الحساب
  // قراءة من مخزن خارجي (localStorage) عند تغيّر المصادقة — setState هنا هو المزامنة المقصودة
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (authLoading) return;
    const uid = user?.uid ?? null;

    if (!uid) {
      const guestData = readGuest();
      loadedUidRef.current = null;
      setLoadedUid(null);
      loaded.current = true;
      commit(guestData, null);
      return;
    }

    const account = readAccount(uid);
    const guest = readGuest();
    const hasGuest = guest.bookmarks.length > 0
      || guest.highlights.length > 0
      || Object.keys(guest.notes).length > 0
      || guest.readLessons.length > 0;

    let next = account;
    if (hasGuest) {
      // دمج محلي مرة واحدة ثم مسح بيانات الضيف حتى لا تتسرّب لحساب آخر
      next = unionLibrary(account, guest);
      safeSet(accountKey(uid), JSON.stringify(next));
      Object.values(GUEST_KEYS).forEach(safeRemove);
    }
    loadedUidRef.current = uid;
    setLoadedUid(uid);
    loaded.current = true;
    commit(next, uid);
  }, [user?.uid, authLoading, commit]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ─── مزامنة التبويبات المتعددة (Cross-Tab Sync) عبر حدث التخزين storage ───
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return;
      const currentUid = loadedUidRef.current;
      if (currentUid === undefined) return;

      if (currentUid === null) {
        if ((Object.values(GUEST_KEYS) as string[]).includes(e.key)) {
          const fresh = readGuest();
          snapshotRef.current = fresh;
          setSnapshot(fresh);
        }
      } else if (e.key === accountKey(currentUid)) {
        const fresh = readAccount(currentUid);
        snapshotRef.current = fresh;
        setSnapshot(fresh);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const update = useCallback((patch: (current: LibrarySnapshot) => LibrarySnapshot) => {
    commit(patch(snapshotRef.current));
  }, [commit]);

  // حارس الزائر: الإضافة/التعديل تعمل محليًا ولكن يظهر تنبيه إرشادي يشجع على التسجيل
  // للمزامنة بين الأجهزة. الحفظ المحلي ضروري حتى تُدمج البيانات عند أول تسجيل دخول.
  const isGuest = !user?.uid;
  const nudgeLogin = useCallback((action?: string): void => {
    if (isGuest) requireLogin({ action: action ?? 'هذه البيانات' });
  }, [isGuest]);

  const toggleBookmark = useCallback((lessonId: string | number) => {
    const id = String(lessonId);
    const isAdding = !snapshotRef.current.bookmarks.includes(id);
    if (isAdding) nudgeLogin('المفضلة');
    update((current) => ({
      ...current,
      bookmarks: current.bookmarks.includes(id)
        ? current.bookmarks.filter((b) => b !== id)
        : [...current.bookmarks, id],
    }));
  }, [update, nudgeLogin]);

  const toggleReadLesson = useCallback((lessonId: string | number) => {
    const id = String(lessonId);
    update((current) => ({
      ...current,
      readLessons: current.readLessons.includes(id)
        ? current.readLessons.filter((r) => r !== id)
        : [...current.readLessons, id],
    }));
  }, [update]);

  const addHighlight = useCallback((highlight: HighlightItem) => {
    nudgeLogin('الفوائد');
    update((current) => ({
      ...current,
      highlights: [
        ...current.highlights.filter((h) => String(h.id ?? h.text) !== String(highlight.id ?? highlight.text)),
        highlight,
      ],
    }));
  }, [update, nudgeLogin]);

  const deleteHighlight = useCallback((highlightId: string | number) => {
    const id = String(highlightId);
    update((current) => ({
      ...current,
      highlights: current.highlights.filter((h) => String(h.id ?? h.text) !== id),
    }));
  }, [update]);

  const updateHighlightColor = useCallback((highlightId: string | number, color: string) => {
    const id = String(highlightId);
    update((current) => ({
      ...current,
      highlights: current.highlights.map((h) =>
        String(h.id ?? h.text) === id ? { ...h, color } : h
      ),
    }));
  }, [update]);

  const saveNoteForLesson = useCallback((lessonId: string | number, text: string) => {
    const id = String(lessonId);
    // حد أقصى لطول الملاحظة الواحدة (3,000 حرف) لحماية حجم المستند في السحابة من تجاوز سقف 1MiB
    const sanitizedText = text.length > 3_000 ? text.slice(0, 3_000) : text;
    // حفظ نص جديد يُنبّه الزائر للتسجيل؛ أما مسح ملاحظة قائمة فلا ينبّه
    const isClearing = !sanitizedText.trim() && Boolean(snapshotRef.current.notes[id]);
    if (!isClearing) nudgeLogin('الملاحظات');
    update((current) => {
      const notes = { ...current.notes };
      if (sanitizedText.trim()) notes[id] = sanitizedText;
      else delete notes[id];
      return { ...current, notes };
    });
  }, [update, nudgeLogin]);

  // استعادة من ملف نسخة احتياطية — دمج محلي فقط
  const restoreLibrary = useCallback((data: {
    bookmarks?: string[];
    highlights?: HighlightItem[];
    notes?: Record<string, string>;
    readLessons?: string[];
  }) => {
    update((current) => unionLibrary(current, normalize(data)));
  }, [update]);

  // تطبيق مباشر لمكتبة مدمجة سحابيًا بدفعة ذرية واحدة تمنع الرجات وتضمن التحديث الفوري
  const applyMergedLibrary = useCallback((merged: {
    bookmarks: string[];
    highlights: HighlightItem[];
    notes: Record<string, string>;
    readLessons: string[];
  }) => {
    commit({
      bookmarks: merged.bookmarks.map(String),
      highlights: merged.highlights,
      notes: merged.notes,
      readLessons: merged.readLessons.map(String),
    });
  }, [commit]);

  return {
    bookmarks: snapshot.bookmarks,
    highlights: snapshot.highlights,
    notes: snapshot.notes,
    readLessons: snapshot.readLessons,
    isDataLoaded: loadedUid === (user?.uid ?? null),
    toggleBookmark,
    toggleReadLesson,
    addHighlight,
    deleteHighlight,
    updateHighlightColor,
    saveNoteForLesson,
    restoreLibrary,
    applyMergedLibrary,
  };
}
