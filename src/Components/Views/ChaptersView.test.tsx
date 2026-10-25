// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ChaptersView from './ChaptersView';
import type { ChapterGroup, Lesson } from '../../types';
import { stopMarkBookKey } from '../../features/stopMarks/model';

const mockToggleChapter = vi.fn();
const mockOpenLessonById = vi.fn();

const sampleChapters: ChapterGroup[] = [
  {
    bookName: 'كتاب الطهارة',
    chapterName: 'باب المياه',
    issues: [
      {
        id: 1,
        title: 'المسألة الأولى: أحكام المياه',
        bookName: 'كتاب الطهارة',
        chapterName: 'باب المياه',
        mainText: 'نص المسألة',
        lessonIndex: 0,
        isRead: false,
      },
      {
        id: 2,
        title: 'المسألة الثانية: الماء النجس',
        bookName: 'كتاب الطهارة',
        chapterName: 'باب المياه',
        mainText: 'نص المسألة 2',
        lessonIndex: 1,
        isRead: true,
      },
    ],
  },
  {
    bookName: 'كتاب الطهارة',
    chapterName: 'باب الآنية',
    issues: [
      {
        id: 3,
        title: 'المسألة الأولى: استعمال أواني الذهب',
        bookName: 'كتاب الطهارة',
        chapterName: 'باب الآنية',
        mainText: 'نص المسألة 3',
        lessonIndex: 2,
        isRead: false,
      },
    ],
  },
];

const sampleLessons: Lesson[] = [
  {
    id: 1,
    title: 'المسألة الأولى: أحكام المياه',
    bookName: 'كتاب الطهارة',
    chapterName: 'باب المياه',
    mainText: 'نص',
  },
];

let mockSelectedBookChapters: ChapterGroup[] = [...sampleChapters];
let mockOpenChapterName: string | null = null;
let mockContentReady = true;
let mockStopMarks: Record<string, { bookName: string; lessonId: string | null; updatedAt: number; deviceId: string }> = {};

vi.mock('../Layout/AppContext', () => ({
  useApp: () => ({
    selectedBookName: 'كتاب الطهارة',
    selectedBookChapters: mockSelectedBookChapters,
    openChapterName: mockOpenChapterName,
    toggleChapter: mockToggleChapter,
    openLessonById: mockOpenLessonById,
    contentReady: mockContentReady,
    stopMarks: mockStopMarks,
    lessons: sampleLessons,
  }),
}));

describe('ChaptersView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedBookChapters = [...sampleChapters];
    mockOpenChapterName = null;
    mockContentReady = true;
    mockStopMarks = {};
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض قائمة الأبواب مع أسماء الفصول والترقيم', () => {
    render(<ChaptersView />);

    expect(screen.getByText(/كتاب الطهارة - الفصول/)).toBeTruthy();
    expect(screen.getByText('باب المياه')).toBeTruthy();
    expect(screen.getByText('باب الآنية')).toBeTruthy();
    expect(screen.getByText('الباب الأول')).toBeTruthy();
    expect(screen.getByText('الباب الثاني')).toBeTruthy();
  });

  it('النقر على شريط الباب يستدعي toggleChapter', () => {
    render(<ChaptersView />);

    const waterChapterBtn = screen.getByText('باب المياه').closest('button');
    expect(waterChapterBtn).toBeTruthy();

    if (waterChapterBtn) {
      fireEvent.click(waterChapterBtn);
      expect(mockToggleChapter).toHaveBeenCalledWith('باب المياه');
    }
  });

  it('يعرض المسائل التابعة للباب عند فتحه', () => {
    mockOpenChapterName = 'باب المياه';

    render(<ChaptersView />);

    expect(screen.getByText('المسألة الأولى: أحكام المياه')).toBeTruthy();
    expect(screen.getByText('المسألة الثانية: الماء النجس')).toBeTruthy();

    const lessonItem = screen.getByText('المسألة الأولى: أحكام المياه');
    fireEvent.click(lessonItem);
    expect(mockOpenLessonById).toHaveBeenCalledWith(1);
  });

  it('يعرض الحالة الفارغة EmptyState عند عدم وجود فصول', () => {
    mockSelectedBookChapters = [];
    mockContentReady = true;

    render(<ChaptersView />);

    expect(screen.getByText('هذا الكتاب فارغ حالياً')).toBeTruthy();
  });

  it('يعرض زر المتابعة عند وجود علامة وقف في الكتاب', () => {
    const key = stopMarkBookKey('كتاب الطهارة');
    mockStopMarks = {
      [key]: {
        bookName: 'كتاب الطهارة',
        lessonId: '1',
        updatedAt: Date.now(),
        deviceId: 'dev-1',
      },
    };

    render(<ChaptersView />);

    const resumeBtn = screen.getByTitle('المسألة الأولى: أحكام المياه');
    expect(resumeBtn).toBeTruthy();

    fireEvent.click(resumeBtn);
    expect(mockOpenLessonById).toHaveBeenCalledWith('1');
  });
});
