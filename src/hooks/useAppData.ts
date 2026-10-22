import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchLessonsFromServer, fetchLessons, fetchGlossary, subscribeToLessons } from '../firebase/services';
import { isFirebaseConfigured, enableFirestoreNetwork } from '../firebase/config';
import { logError } from '../utils/logError';
import { readCachedLessons, writeCachedLessons } from '../utils/contentCache';
import { BOOKS_LIST } from '../data/books';
import type { Lesson, GlossaryMap } from '../types';

const CLOUD_LESSONS_TIMEOUT_MS = 15_000;
// مهلة السماح: أقصى انتظار للخادم قبل عرض النسخة المحلية مع متابعة الجلب في الخلفية.
const CLOUD_GRACE_MS = 6_000;
// إعادة المحاولة التلقائية عند فشل الجلب السحابي الأولي (شبكة بطيئة أو تهيئة Firestore باردة).
// تُنهي رسالة "تعذر تحديث المسائل" التي كانت تبقى حتى التحديث اليدوي رغم أن الشبكة سليمة.
const CLOUD_RETRY_BASE_MS = 3_000;
const CLOUD_RETRY_MAX_MS = 30_000;

/**
 * hook مسؤول عن تحميل بيانات المحتوى (المسائل والمسرد)
 * من الداتا المحلية أولاً، ثم دمج بيانات السحابة عند توفرها
 */
export function useAppData({ isOffline }: { isOffline: boolean }) {
  // آخر نسخة نزلت من السحابة (تُقرأ مرة واحدة عند الإقلاع قبل أي رسم) —
  // هي الأحدث من اللقطة المضمّنة في البناء، خصوصًا بعد إضافة مسائل جديدة.
  const [cachedAtBoot] = useState<Lesson[]>(() => readCachedLessons() ?? []);
  const [rawLessons, setRawLessons] = useState<Lesson[]>(cachedAtBoot);
  // مرجع لأحدث مجموعة معروضة — يمنع استبدال نسخة أحدث (من السحابة) بنسخة كاش أقدم.
  const rawLessonsRef = useRef<Lesson[]>(cachedAtBoot);
  useEffect(() => { rawLessonsRef.current = rawLessons; }, [rawLessons]);
  const [glossary, setGlossary] = useState<GlossaryMap>({});
  const [cloudStatus, setCloudStatus] = useState(isFirebaseConfigured ? 'syncing' : 'local');
  // على الإنترنت ننتظر جواب الخادم (نجاحًا أو فشلًا) ثم نستخدم المحلي عند الحاجة.
  // دون اتصال نفتح فور اكتمال النسخة المحلية من المسائل.
  const [cloudLessonsLoaded, setCloudLessonsLoaded] = useState(false);
  // النسخة المحلية جاهزة فورًا إن وُجد كاش من جلسة سابقة (بدل انتظار حزمة البيانات المضمّنة).
  const [localLessonsLoaded, setLocalLessonsLoaded] = useState(cachedAtBoot.length > 0);
  const [localLessonIds, setLocalLessonIds] = useState<string[]>([]);
  const [cloudAttemptDone, setCloudAttemptDone] = useState(!isFirebaseConfigured);
  // عدّاد إعادة المحاولة التلقائية — يزيد عند فشل الجلب فيُعيد الأثر المحاولة بتراجع أسّي.
  const [cloudRetryNonce, setCloudRetryNonce] = useState(0);
  // انقضت مهلة السماح لانتظار الخادم — بعدها نفتح بالنسخة المحلية ولا نُبقي المستخدم
  // عالقًا على شاشة البداية حتى تنتهي مهلة الخادم الطويلة (تهيئة Firestore باردة على الفون).
  const [cloudGraceElapsed, setCloudGraceElapsed] = useState(false);
  const cloudRetryRef = useRef(0);
  // لرصد لحظة عودة الاتصال: عندها نحاول فورًا بلا انتظار تراجع أسّي قد يبلغ 30 ثانية.
  const wasOfflineRef = useRef(isOffline);
  const contentSyncDone = isOffline
    ? localLessonsLoaded
    : cloudLessonsLoaded || (localLessonsLoaded && (cloudAttemptDone || cloudGraceElapsed));

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

  // اعتماد نسخة محلية (كاش) فقط إن كانت لا تقل عن المعروض حاليًا — لا نتراجع لنسخة أقدم.
  const applyCachedLessons = useCallback((cached: Lesson[]): void => {
    if (cached.length === 0 || cached.length < rawLessonsRef.current.length) return;
    rawLessonsRef.current = cached;
    setRawLessons(cached);
    writeCachedLessons(cached);
  }, []);

  // مستمع دائم على المسائل يبدأ قبل أي قراءة لقطية.
  // يُدفئ اتصال Firestore ويمنع عطل ca9/b815 المعروف (قراءة عابرة كأول عملية على اتصال بارد)،
  // ويعطي المحتوى تحديثًا حيًا عند تعديله من الإدارة بلا حاجة لإعادة تحميل.
  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    void subscribeToLessons(
      (cloudLessons, fromCache) => {
        if (cancelled || cloudLessons.length === 0) return;
        if (fromCache) {
          // لقطة كاش فقط: اعرضها إن كانت أحدث، ولا تُعلن نجاح السحابة بعد.
          applyCachedLessons(cloudLessons);
          return;
        }
        rawLessonsRef.current = cloudLessons;
        setRawLessons(cloudLessons);
        writeCachedLessons(cloudLessons);
        setCloudLessonsLoaded(true);
        setCloudStatus('synced');
        setCloudAttemptDone(true);
      },
      (error) => {
        if (!cancelled) logError('appData.lessonsListener', error);
      },
    )
      .then((unsub) => {
        if (cancelled) unsub();
        else unsubscribe = unsub;
      })
      .catch((error) => {
        if (!cancelled) logError('appData.lessonsListener', error);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [applyCachedLessons]);

  // جلب البيانات من السحابة
  // manual = إعادة محاولة يدوية (زر المستخدم): تُظهر حالة "جارٍ التحديث" فورًا حتى
  // يرى المستخدم أن الضغط بدأ فعلًا، وتعيد عدّاد التراجع للصفر لمحاولة سريعة.
  const reloadFromCloud = useCallback(async (manual = false): Promise<boolean> => {
    if (!isFirebaseConfigured) return false;
    // بعد عودة الشبكة قد يكون Firestore عالقًا في وضع "غير متصل" فيفشل كل طلب بالمهلة.
    // نجبره على إعادة الاتصال قبل كل محاولة (لا يُكلف شيئًا إن كان متصلًا أصلًا).
    await enableFirestoreNetwork();
    if (manual) {
      cloudRetryRef.current = 0;
      setCloudStatus('syncing');
      setCloudAttemptDone(false);
    }
    const glossaryRequest = fetchGlossary().catch(() => null);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const cloudLessonsRequest = Promise.race([
      fetchLessonsFromServer(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('انتهت مهلة تحميل المسائل من السحابة')), CLOUD_LESSONS_TIMEOUT_MS);
      }),
    ]);
    let succeeded = false;
    let failure: unknown = null;
    try {
      const cloudLessons = await cloudLessonsRequest;
      if (cloudLessons.length > 0) {
        rawLessonsRef.current = cloudLessons;
        setRawLessons(cloudLessons);
        // احفظ آخر نسخة نزلت فعلًا — تُعرض عند الفتح لاحقًا بلا إنترنت حتى لو تغيّرت اللقطة المضمّنة.
        writeCachedLessons(cloudLessons);
        setCloudLessonsLoaded(true);
        setCloudStatus('synced');
        succeeded = true;
      } else {
        // نجح الاتصال لكن المجموعة فارغة (نادر) — ليست حالة "غير متصل"
        setCloudStatus('available');
        succeeded = true;
      }
    } catch (error) {
      failure = error;
      // فشل الخادم لا يعني بالضرورة انقطاع الاتصال: قد تكون التهيئة الباردة/الشبكة بطيئة.
      // نجرّب الكاش المحلي (getDocs يقرأ من IndexedDB فورًا) لعرض أي نسخة سحابية سابقة،
      // ونبقي الحالة 'syncing' في أول محاولات حتى لا تظهر رسالة "تعذر" مبكرًا بلا داعٍ.
      try {
        const cached = await fetchLessons();
        // الكاش السحابي أصدق من اللقطة المضمّنة إن كان أحدث (عددًا أكبر = مسائل أُضيفت بعد البناء).
        applyCachedLessons(cached);
      } catch { /* تجاهل — الداتا المحلية المضمّنة تغطي */ }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setCloudAttemptDone(true);
    }
    // نجاح = إعادة تصفير عدّاد التراجع؛ فشل = جدولة محاولة تلقائية لاحقة.
    cloudRetryRef.current = succeeded ? 0 : cloudRetryRef.current + 1;
    if (!succeeded) {
      const attempts = cloudRetryRef.current;
      // نُظهر "تعذر تحديث المسائل" فقط بعد فشل متكرر (≥3 محاولات) والجهاز يزعم أنه متصل،
      // وإلا نبقى على 'syncing' مع إعادة المحاولة فلا تقفز الرسالة عند مجرد بطء البداية.
      setCloudStatus((prev) => (manual || attempts >= 3 ? 'offline' : (prev === 'synced' ? prev : 'syncing')));
      // تسجيل السبب الفعلي مرة واحدة (مخنوق داخليًا) ليمكن تشخيصه من سجل الأخطاء
      if (attempts === 1) logError('appData.reloadFromCloud', failure, { attempt: attempts });
      setCloudRetryNonce((n) => n + 1);
    }
    // المسرد غير مطلوب لعرض المسائل، لذلك لا يحجب اكتمال التحميل أو شاشة البداية.
    void glossaryRequest.then((cloudGlossary) => {
        if (cloudGlossary && Object.keys(cloudGlossary).length > 0) {
          setGlossary((prev) => ({ ...prev, ...cloudGlossary }));
        }
      });
    return succeeded;
  }, [applyCachedLessons]);

  // تحميل البيانات من السحابة مؤجّلاً بحيث لا ينافس أول رسم للشاشة
  // (يُجدول بعد ~0.6 ثانية — بعد اكتمال أول رسم عادةً — ويُعاد عند تغيّر حالة الاتصال)
  useEffect(() => {
    const comingOnline = wasOfflineRef.current && !isOffline;
    wasOfflineRef.current = isOffline;
    // عاد الاتصال: صفّر التراجع وحاول فورًا حتى لا يبقى المستخدم على رسالة "تعذر".
    if (comingOnline) {
      cloudRetryRef.current = 0;
      setCloudStatus(isFirebaseConfigured ? 'syncing' : 'local');
    }
    // بلا اتصال: الحالة الأولية 'syncing' كانت تعلق للأبد — نعلنها بصراحة
    // مزامنة مقصودة مع حالة خارجية (الاتصال) لا بديل تفاعلي لها
    if (isOffline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCloudStatus(isFirebaseConfigured ? 'offline' : 'local');
      // بلا إنترنت: اقرأ كاش Firestore (IndexedDB) مباشرةً — قد يحمل مسائل أُضيفت
      // بعد بناء النسخة المضمّنة، فلا نكتفي باللقطة القديمة.
      let cancelled = false;
      void (async () => {
        try {
          const cached = await fetchLessons();
          if (!cancelled) applyCachedLessons(cached);
        } catch { /* تجاهل — النسخة المحلية المتاحة تكفي */ }
      })();
      return () => { cancelled = true; };
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
    // لا نُغلق بوابة المحتوى عند إعادة المحاولة في الخلفية (nonce>0) وإلا عادت شاشة البداية.
    if (cloudRetryNonce === 0) setCloudAttemptDone(false);
    // تراجع أسّي بين المحاولات: 3s ثم 6s ثم 12s ... بحد أقصى 30s — يمنع إغراق الشبكة
    // ويعالج تهيئة Firestore الباردة أو الشبكة البطيئة تلقائيًا بلا تدخل يدوي.
    const delay = comingOnline
      ? 0
      : cloudRetryNonce === 0
        ? 600
        : Math.min(CLOUD_RETRY_BASE_MS * 2 ** (cloudRetryNonce - 1), CLOUD_RETRY_MAX_MS);
    const t = setTimeout(() => { void reloadFromCloud(); }, delay);
    return () => clearTimeout(t);
  }, [isOffline, reloadFromCloud, cloudLessonsLoaded, cloudRetryNonce, applyCachedLessons]);

  // مهلة السماح: بعدها نفتح التطبيق بالنسخة المحلية حتى لو تأخر الخادم (فيتابع في الخلفية).
  // هذا يمنع بقاء المستخدم على شاشة البداية 15 ثانية ثم رؤية رسالة "تعذر" لمجرد بطء البداية.
  useEffect(() => {
    if (isOffline || cloudLessonsLoaded) return undefined;
    const t = setTimeout(() => setCloudGraceElapsed(true), CLOUD_GRACE_MS);
    return () => clearTimeout(t);
  }, [isOffline, cloudLessonsLoaded]);

  // تحميل البيانات المحلية (نسخة احتياطية عند غياب السحابة) ديناميكيًا
  // حتى لا تدخل ملفات الداتا الكبيرة في حزمة التحميل الأولية
  useEffect(() => {
    let cancelled = false;
    void import('../data/lessons')
      .then((lmod) => {
        if (cancelled) return;
        const bundled = lmod.lessonsData || [];
        // لا تستبدل كاشًا أحدث (مسائل أُضيفت بعد البناء) باللقطة المضمّنة؛
        // لكن إن كانت اللقطة المضمّنة أكبر (بناء أحدث فيه مسائل أكثر) فهي الأصدق.
        setRawLessons((prev) => (prev.length >= bundled.length ? prev : bundled));
        setLocalLessonIds(bundled.map((lesson) => String(lesson.id)));
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
