// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import LessonsView from './LessonsView';
import type { ChapterGroup, Lesson } from '../../types';
import * as printExport from '../../utils/printExport';
import { stopMarkBookKey } from '../../features/stopMarks/model';

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
let mockStopMarks: Record<string, { bookName: string; lessonId: string | null; updatedAt: number; deviceId: string }> = {};

vi.mock('../Layout/AppContext', () => ({
  useApp: () => ({
    selectedBookName: 'كتاب الطهارة',
    selectedBookChapters: mockSelectedBookChapters,
    openLessonById: mockOpenLessonById,
    lessons: sampleLessons,
    stopMarks: mockStopMarks,
  }),
}));

vi.mock('../../utils/printExport', () => ({
  exportChapterPrint: vi.fn(),
}));

describe('LessonsView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedBookChapters = [...sampleChapters];
    mockStopMarks = {};
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض ترويسة فهرس المسائل والفصول وقائمة المسائل', () => {
    render(<LessonsView />);

    expect(screen.getByText('فهرس المسائل')).toBeTruthy();
    expect(screen.getByText('كتاب الطهارة')).toBeTruthy();
    expect(screen.getByText('باب المياه')).toBeTruthy();
    expect(screen.getByText('المسألة الأولى: أحكام المياه')).toBeTruthy();
    expect(screen.getByText('المسألة الثانية: الماء النجس')).toBeTruthy();
  });

  it('النقر على المسألة يستدعي openLessonById', () => {
    render(<LessonsView />);

    const item = screen.getByText('المسألة الأولى: أحكام المياه');
    fireEvent.click(item);

    expect(mockOpenLessonById).toHaveBeenCalledWith(1);
  });

  it('النقر على طباعة الباب يستدعي exportChapterPrint', () => {
    render(<LessonsView />);

    const printBtn = screen.getByTitle('طباعة أو تصدير كـ PDF');
    expect(printBtn).toBeTruthy();

    fireEvent.click(printBtn);
    expect(printExport.exportChapterPrint).toHaveBeenCalled();
  });

  it('يعرض الحالة الفارغة EmptyState عند عدم وجود فصول', () => {
    mockSelectedBookChapters = [];

    render(<LessonsView />);

    expect(screen.getByText('لا توجد مسائل حالياً')).toBeTruthy();
  });

  it('يعرض زر متابعة القراءة عند وجود علامة وقف في الكتاب', () => {
    const key = stopMarkBookKey('كتاب الطهارة');
    mockStopMarks = {
      [key]: {
        bookName: 'كتاب الطهارة',
        lessonId: '1',
        updatedAt: Date.now(),
        deviceId: 'dev-1',
      },
    };

    render(<LessonsView />);

    const resumeBtn = screen.getByTitle('المسألة الأولى: أحكام المياه');
    expect(resumeBtn).toBeTruthy();

    fireEvent.click(resumeBtn);
    expect(mockOpenLessonById).toHaveBeenCalledWith('1');
  });
});
