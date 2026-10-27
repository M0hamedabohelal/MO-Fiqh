// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReviewMode, recordReviewSession, readReviewStats } from './useReviewMode';
import type { Lesson, HighlightItem } from '../types';

describe('useReviewMode Hook', () => {
  const mockLessons: Lesson[] = [
    {
      id: 1,
      title: 'المسألة الأولى: في المياه',
      mainText: 'الأصل في الماء الطهارة ما لم يتغير',
      sheikhExplanation: 'الشرح والبيان أن الماء طاهر بأصله',
      bookName: 'كتاب الطهارة',
      chapterName: 'الباب الأول',
    },
    {
      id: 2,
      title: 'المسألة الثانية: نجاسة الميتة',
      mainText: 'ميتة ما لا نفس له سائلة طاهرة',
      sheikhExplanation: 'كالذباب والبعوض ونحوهما',
      bookName: 'كتاب الطهارة',
      chapterName: 'الباب الأول',
    },
  ];

  const mockHighlights: HighlightItem[] = [
    {
      id: 'h1',
      lessonId: 1,
      text: 'فائدة نفيسة في تطهير المياه',
      title: 'تطهير الماء',
      bookName: 'كتاب الطهارة',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('يبني بطاقات المراجعة من المسائل المقروءة والفوائد المحفوظة', () => {
    const { result } = renderHook(() => useReviewMode(mockLessons, ['1'], mockHighlights));
    expect(result.current.totalCount).toBe(2);
    expect(result.current.currentItem?.title).toContain('المسألة الأولى');
  });

  it('يتيح قلب البطاقة بين الوجه والظهر', () => {
    const { result } = renderHook(() => useReviewMode(mockLessons, ['1'], []));
    expect(result.current.isFlipped).toBe(false);

    act(() => {
      result.current.flip();
    });
    expect(result.current.isFlipped).toBe(true);

    act(() => {
      result.current.flip();
    });
    expect(result.current.isFlipped).toBe(false);
  });

  it('تقييم البطاقة كـ mastered ينتقل للبطاقة التالية أو يُكمل الجلسة', () => {
    const { result } = renderHook(() => useReviewMode(mockLessons, ['1', '2'], []));
    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.markCard('mastered');
    });
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isFlipped).toBe(false);

    act(() => {
      result.current.markCard('review');
    });
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.masteredCount).toBe(1);
    expect(result.current.reviewAgainCount).toBe(1);
  });

  it('تسجيل جلسة المراجعة يحدّث إحصائيات التخزين المحلي', () => {
    expect(readReviewStats().totalCompletedSessions).toBe(0);
    recordReviewSession(5, 4);
    const stats = readReviewStats();
    expect(stats.totalCompletedSessions).toBe(1);
    expect(stats.totalCardsReviewed).toBe(5);
    expect(stats.totalMastered).toBe(4);
  });
});
