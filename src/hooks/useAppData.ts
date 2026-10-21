import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchLessonsFromServer, fetchGlossary } from '../firebase/services';
import { isFirebaseConfigured } from '../firebase/config';
import { BOOKS_LIST } from '../data/books';
import type { Lesson, GlossaryMap } from '../types';

const CLOUD_LESSONS_TIMEOUT_MS = 15_000;

/**
 * hook مسؤول عن تحميل بيانات المحتوى (المسائل والمسرد)
 * من الداتا المحلية أولاً، ثم دمج بيانات السحابة عند توفرها
 */
export function useAppData({ isOffline }: { isOffline: boolean }) {
  const [rawLessons, setRawLessons] = useState<Lesson[]>([]);
  const [glossary, setGlossary] = useState<GlossaryMap>({});
  const [cloudStatus, setCloudStatus] = useState(isFirebaseConfigured ? 'syncing' : 'local');
  // على الإنترنت ننتظر جواب الخادم (نجاحًا أو فشلًا) ثم نستخدم المحلي عند الحاجة.
  // دون اتصال نفتح فور اكتمال النسخة المحلية من المسائل.
  const [cloudLessonsLoaded, setCloudLessonsLoaded] = useState(false);
  const [localLessonsLoaded, setLocalLessonsLoaded] = useState(false);
  const [localLessonIds, setLocalLessonIds] = useState<string[]>([]);
  const [cloudAttemptDone, setCloudAttemptDone] = useState(!isFirebaseConfigured);
  const contentSyncDone = isOffline
    ? localLessonsLoaded
    : cloudLessonsLoaded || (cloudAttemptDone && localLessonsLoaded);

  // ترتيب المسائل حسب الكتاب → الباب → الترتيب الأبجدي
  const lessons = useMemo(() => {
    const ordinals = [
      { w: 'العشرون', v: 20 },
      { w: 'الحادية عشرة', v: 11 }, { w: 'الثانية عشرة', v: 12 }, { w: 'الثالثة عشرة', v: 13 }, { w: 'الرابعة عشرة', v: 14 }, { w: 'الخامسة عشرة', v: 15 },
      { w: 'السادسة عشرة', v: 16 }, { w: 'السابعة عشرة', v: 17 }, { w: 'الثامنة عشرة', v: 18 }, { w: 'التاسعة عشرة', v: 19 },
      { w: 'الحادي عشر', v: 11 }, { w: 'الثاني عشر', v: 12 }, { w: 'الثالث عشر', v: 13 }, { w: 'الرابع عشر', v: 14 }, { w: 'الخامس عشر', v: 15 },
      { w: 'السادس عشر', v: 16 }, { w: 'السابع عشر', v: 17 }, { w: 'الثامن عشر', v: 18 }, { w: 'التاسع عشر', v: 19 },
      { w: 'الأولى', v: 1 }, { w: 'الثانية', v: 2 }, { w: 'الثالثة', v: 3 }, { w: 'الرابعة', v: 4 }, { w: 'الخامسة', v: 5 },
      { w: 'السادسة', v: 6 }, { w: 'السابعة', v: 7 }, { w: 'الثامنة', v: 8 }, { w: 'التاسعة', v: 9 }, { w: 'العاشرة', v: 10 },
      { w: 'الأول', v: 1 }, { w: 'الثاني', v: 2 }, { w: 'الثالث', v: 3 }, { w: 'الرابع', v: 4 }, { w: 'الخامس', v: 5 },
      { w: 'السادس', v: 6 }, { w: 'السابع', v: 7 }, { w: 'الثامن', v: 8 }, { w: 'التاسع', v: 9 }, { w: 'العاشر', v: 10 }
    ];

    const normalizeText = (text: string | undefined): string => {
      if (!text) return '';
      return text.replace(/[أإآا]/g, 'ا').replace(/[يى]/g, 'ي').replace(/ة/g, 'ه');
    };

    const getOrdinalVal = (text: string | undefined): number => {
      if (!text) return 999;
      const normalizedText = normalizeText(text);
      for (const o of ordinals) {
        if (normalizedText.includes(normalizeText(o.w))) return o.v;
      }
      return 999;
    };

    return [...rawLessons].sort((a, b) => {
      const bNameA = (a.bookName || '').trim();
      const bNameB = (b.bookName || '').trim();
      const bookA = BOOKS_LIST.indexOf(bNameA) === -1 ? 999 : BOOKS_LIST.indexOf(bNameA);
      const bookB = BOOKS_LIST.indexOf(bNameB) === -1 ? 999 : BOOKS_LIST.indexOf(bNameB);
      if (bookA !== bookB) return bookA - bookB;
      const chA = getOrdinalVal(a.chapterName);
      const chB = getOrdinalVal(b.chapterName);
      if (chA !== chB) return chA - chB;
      const issueA = getOrdinalVal(a.title);
      const issueB = getOrdinalVal(b.title);
      if (issueA !== issueB) return issueA - issueB;
      return Number(a.id) - Number(b.id);
    });
  }, [rawLessons]);

  // جلب البيانات من السحابة
  const reloadFromCloud = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    setCloudAttemptDone(false);
    const glossaryRequest = fetchGlossary().catch(() => null);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const cloudLessonsRequest = Promise.race([
      fetchLessonsFromServer(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('انتهت مهلة تحميل المسائل من السحابة')), CLOUD_LESSONS_TIMEOUT_MS);
      }),
    ]);
    try {
      const cloudLessons = await cloudLessonsRequest;
      if (cloudLessons.length > 0) {
        setRawLessons(cloudLessons);
        setCloudLessonsLoaded(true);
        setCloudStatus('synced');
      } else {
        setCloudStatus('offline');
      }
    } catch {
      setCloudStatus('offline');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setCloudAttemptDone(true);
    }
    // المسرد غير مطلوب لعرض المسائل، لذلك لا يحجب اكتمال التحميل أو شاشة البداية.
    void glossaryRequest.then((cloudGlossary) => {
        if (cloudGlossary && Object.keys(cloudGlossary).length > 0) {
          setGlossary((prev) => ({ ...prev, ...cloudGlossary }));
        }
      });
  }, []);

  // تحميل البيانات من السحابة مؤجّلاً بحيث لا ينافس أول رسم للشاشة
  // (يُجدول بعد ~0.6 ثانية — بعد اكتمال أول رسم عادةً — ويُعاد عند تغيّر حالة الاتصال)
  useEffect(() => {
    // بلا اتصال: الحالة الأولية 'syncing' كانت تعلق للأبد — نعلنها بصراحة
    // مزامنة مقصودة مع حالة خارجية (الاتصال) لا بديل تفاعلي لها
    if (isOffline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCloudStatus(isFirebaseConfigured ? 'offline' : 'local');
      return;
    }
    // إن سبق نجاح الجلب السحابي، لا نعيد جلب المحتوى كاملًا عند كل عودة أونلاين
    // (المحتوى العام نادر التغيّر؛ التحديث اليدوي متاح عبر reloadFromCloud)
    if (cloudLessonsLoaded) {
      // عادت الشبكة، لكن المحتوى محمّل بالفعل؛ لا نزعم تنفيذ تنزيل جديد عند كل عودة اتصال.
      // حالة التحديث اليدوي تظل مستقلة في زر الإعدادات.
      setCloudStatus((previous) => previous === 'synced' ? previous : 'available');
      return;
    }
    // طالما الجهاز online، اجعل البوابة تنتظر نتيجة محاولة الخادم قبل عرض المحلي.
    // في حال فشل الطلب، reloadFromCloud يحسم المحاولة ويُفتح المحلي الكامل.
    setCloudAttemptDone(false);
    const t = setTimeout(() => { reloadFromCloud(); }, 600);
    return () => clearTimeout(t);
  }, [isOffline, reloadFromCloud, cloudLessonsLoaded]);

  // تحميل البيانات المحلية (نسخة احتياطية عند غياب السحابة) ديناميكيًا
  // حتى لا تدخل ملفات الداتا الكبيرة في حزمة التحميل الأولية
  useEffect(() => {
    let cancelled = false;
    void import('../data/lessons')
      .then((lmod) => {
        if (cancelled) return;
        setRawLessons((prev) => (prev.length ? prev : lmod.lessonsData || []));
        setLocalLessonIds((lmod.lessonsData || []).map((lesson) => String(lesson.id)));
        setLocalLessonsLoaded(true);
      })
      .catch(() => {});
    // تحميل المسرد منفصل: بطء بياناته لا يؤخر ظهور قائمة المسائل.
    void import('../data/glossary')
      .then((gmod) => {
        if (!cancelled) setGlossary((prev) => ({ ...(gmod.glossaryData || {}), ...prev }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return { lessons, glossary, cloudStatus, setCloudStatus, reloadFromCloud, cloudLessonsLoaded, contentSyncDone, localLessonIds };
}
