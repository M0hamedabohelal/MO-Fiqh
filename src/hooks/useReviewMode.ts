// useReviewMode.ts — منطق وضع المراجعة والاختبار السريع
// يتيح استذكار المسائل المقروءة والفوائد المحفوظة وتتبع تقدم المراجعة
import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Lesson, HighlightItem } from '../types';

export interface ReviewItem {
  id: string;
  type: 'lesson' | 'highlight';
  title: string;
  frontText: string;
  backText: string;
  bookName?: string;
  chapterName?: string;
}

export const REVIEWS_UPDATED_EVENT = 'fqh:reviews_updated';
const STORAGE_KEY_REVIEWS = 'guest_review_stats_v1';

export interface ReviewStats {
  totalCompletedSessions: number;
  totalCardsReviewed: number;
  totalMastered: number;
  lastReviewedAt: number | null;
}

export function readReviewStats(): ReviewStats {
  if (typeof window === 'undefined') {
    return { totalCompletedSessions: 0, totalCardsReviewed: 0, totalMastered: 0, lastReviewedAt: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVIEWS);
    if (!raw) return { totalCompletedSessions: 0, totalCardsReviewed: 0, totalMastered: 0, lastReviewedAt: null };
    return JSON.parse(raw);
  } catch {
    return { totalCompletedSessions: 0, totalCardsReviewed: 0, totalMastered: 0, lastReviewedAt: null };
  }
}

export function recordReviewSession(cardsReviewed: number, masteredCount: number): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = readReviewStats();
    const updated: ReviewStats = {
      totalCompletedSessions: prev.totalCompletedSessions + 1,
      totalCardsReviewed: prev.totalCardsReviewed + cardsReviewed,
      totalMastered: prev.totalMastered + masteredCount,
      lastReviewedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(REVIEWS_UPDATED_EVENT, { detail: updated }));
  } catch {
    // تجاهل خطأ التخزين
  }
}

export function useReviewStats(): ReviewStats {
  const [stats, setStats] = useState<ReviewStats>(() => readReviewStats());

  useEffect(() => {
    const handler = (): void => setStats(readReviewStats());
    window.addEventListener(REVIEWS_UPDATED_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(REVIEWS_UPDATED_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return stats;
}

export function useReviewMode(
  lessons: Lesson[],
  readLessonIds: string[] = [],
  highlights: HighlightItem[] = [],
) {
  // تجميع قائمة المراجعة من المسائل المقروءة والفوائد المحفوظة
  const items: ReviewItem[] = useMemo(() => {
    const res: ReviewItem[] = [];

    // المسائل المقروءة: الواجهة = نص المسألة/الحكم، الخلفية = تعليق الشيخ
    for (const id of readLessonIds) {
      const lesson = lessons.find((l) => String(l.id) === String(id));
      if (lesson && (lesson.mainText || lesson.sheikhExplanation)) {
        res.push({
          id: `lesson-${lesson.id}`,
          type: 'lesson',
          title: lesson.title,
          frontText: lesson.mainText || lesson.title,
          backText: lesson.sheikhExplanation || 'لا يوجد تعليق مضاف لهذه المسألة.',
          bookName: lesson.bookName,
          chapterName: lesson.chapterName,
        });
      }
    }

    // الفوائد المحفوظة
    for (const h of highlights) {
      const lesson = lessons.find((l) => String(l.id) === String(h.lessonId));
      res.push({
        id: `highlight-${h.id}`,
        type: 'highlight',
        title: h.title || lesson?.title || 'فائدة محفوظة',
        frontText: h.text,
        backText: lesson?.sheikhExplanation || lesson?.mainText || 'فائدة من مقتطفاتك المحفوظة.',
        bookName: h.bookName || lesson?.bookName,
      });
    }

    return res;
  }, [lessons, readLessonIds, highlights]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  const [reviewAgainIds, setReviewAgainIds] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentItem = items[currentIndex] as ReviewItem | undefined;

  const flip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const markCard = useCallback(
    (status: 'mastered' | 'review') => {
      if (!currentItem) return;

      if (status === 'mastered') {
        setMasteredIds((prev) => [...new Set([...prev, currentItem.id])]);
      } else {
        setReviewAgainIds((prev) => [...new Set([...prev, currentItem.id])]);
      }

      // الانتقال للبطاقة التالية
      if (currentIndex < items.length - 1) {
        setCurrentIndex((i) => i + 1);
        setIsFlipped(false);
      } else {
        // انتهت الجلسة
        setIsCompleted(true);
        const finalMastered = status === 'mastered' ? masteredIds.length + 1 : masteredIds.length;
        recordReviewSession(items.length, finalMastered);
      }
    },
    [currentItem, currentIndex, items.length, masteredIds.length],
  );

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredIds([]);
    setReviewAgainIds([]);
    setIsCompleted(false);
  }, []);

  return {
    items,
    totalCount: items.length,
    currentIndex,
    currentItem,
    isFlipped,
    flip,
    markCard,
    reset,
    isCompleted,
    masteredCount: masteredIds.length,
    reviewAgainCount: reviewAgainIds.length,
  };
}
