import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchLessons, fetchGlossary } from '../firebase/services';
import { isFirebaseConfigured } from '../firebase/config';
import { BOOKS_LIST } from '../data/books';
import { lessonsData } from '../data/lessons';
import { glossaryData as staticGlossary } from '../data/glossary';

/**
 * hook مسؤول عن تحميل بيانات المحتوى (المسائل والمسرد)
 * من الداتا المحلية أولاً، ثم دمج بيانات السحابة عند توفرها
 */
export function useAppData({ isOffline }) {
  const [rawLessons, setRawLessons] = useState(lessonsData);
  const [glossary, setGlossary] = useState(staticGlossary);
  const [cloudStatus, setCloudStatus] = useState(isFirebaseConfigured ? 'syncing' : 'local');

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

    const normalizeText = (text) => {
      if (!text) return '';
      return text.replace(/[أإآا]/g, 'ا').replace(/[يى]/g, 'ي').replace(/ة/g, 'ه');
    };

    const getOrdinalVal = (text) => {
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
      return a.id - b.id;
    });
  }, [rawLessons]);

  // جلب البيانات من السحابة
  const reloadFromCloud = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    try {
      const [cloudLessons, cloudGlossary] = await Promise.all([fetchLessons(), fetchGlossary()]);
      if (cloudLessons?.length > 0) setRawLessons(cloudLessons);
      if (cloudGlossary && Object.keys(cloudGlossary).length > 0) {
        setGlossary((prev) => ({ ...prev, ...cloudGlossary }));
      }
      setCloudStatus('synced');
    } catch {
      setCloudStatus('offline');
    }
  }, []);

  useEffect(() => { reloadFromCloud(); }, [reloadFromCloud]);

  useEffect(() => {
    if (!isOffline) reloadFromCloud();
  }, [isOffline, reloadFromCloud]);

  return { lessons, glossary, cloudStatus, setCloudStatus, reloadFromCloud };
}
