// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BooksView from './BooksView';
import type { BookStats, Lesson } from '../../types';
import { stopMarkBookKey } from '../../features/stopMarks/model';

const mockOpenBookChapters = vi.fn();
const mockOpenLessonById = vi.fn();

const sampleBooks: BookStats[] = [
  {
    bookName: 'كتاب الطهارة',
    chaptersCount: 10,
    issuesCount: 53,
    readCount: 53,
    progressPercent: 100,
  },
  {
    bookName: 'كتاب الصلاة',
    chaptersCount: 5,
    issuesCount: 32,
    readCount: 10,
    progressPercent: 31,
  },
];

const sampleLessons: Lesson[] = [
  {
    id: 1,
    title: 'المسألة الأولى: أحكام المياه',
    bookName: 'كتاب الطهارة',
    chapterName: 'باب المياه',
    mainText: 'نص المسألة',
  },
  {
    id: 101,
    title: 'المسألة الأولى: شروط وجوب الصلاة',
    bookName: 'كتاب الصلاة',
    chapterName: 'باب الصلاة',
    mainText: 'نص الصلاة',
  },
];

let mockStopMarks: Record<string, { bookName: string; lessonId: string | null; updatedAt: number; deviceId: string }> = {};

vi.mock('../Layout/AppContext', () => ({
  useApp: () => ({
    booksWithStats: sampleBooks,
    lessons: sampleLessons,
    stopMarks: mockStopMarks,
    openBookChapters: mockOpenBookChapters,
    openLessonById: mockOpenLessonById,
    contentReady: true,
  }),
}));

vi.mock('../UI/GuestAccountCard', () => ({
  default: () => <div data-testid="guest-account-card">Guest Card</div>,
}));

describe('BooksView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStopMarks = {};
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض بطاقات الكتب وإحصائياتها بنجاح', () => {
    render(<BooksView />);

    expect(screen.getByText(/فهرس الكتب/)).toBeTruthy();
    expect(screen.getAllByText('كتاب الطهارة').length).toBeGreaterThan(0);
    expect(screen.getAllByText('كتاب الصلاة').length).toBeGreaterThan(0);
    expect(screen.getByText('53 مسألة')).toBeTruthy();
    expect(screen.getByText('32 مسألة')).toBeTruthy();
  });

  it('النقر على بطاقة الكتاب يستدعي openBookChapters', () => {
    render(<BooksView />);

    const buttons = screen.getAllByRole('button');
    const taharahBtn = buttons.find((btn) => btn.textContent?.includes('كتاب الطهارة'));
    expect(taharahBtn).toBeDefined();

    if (taharahBtn) {
      fireEvent.click(taharahBtn);
      expect(mockOpenBookChapters).toHaveBeenCalledWith('كتاب الطهارة');
    }
  });

  it('يعرض شارة الإتمام إذا كان الكتاب مكتملاً بالكامل', () => {
    render(<BooksView />);

    expect(screen.getByTitle('كتاب مُتمم')).toBeTruthy();
  });

  it('يعرض زر متابعة القراءة عند وجود علامة وقف ويستدعي openLessonById', () => {
    const key = stopMarkBookKey('كتاب الصلاة');
    mockStopMarks = {
      [key]: {
        bookName: 'كتاب الصلاة',
        lessonId: '101',
        updatedAt: Date.now(),
        deviceId: 'device-test',
      },
    };

    render(<BooksView />);

    const continueBtn = screen.getByTitle('المسألة الأولى: شروط وجوب الصلاة');
    expect(continueBtn).toBeTruthy();

    fireEvent.click(continueBtn);
    expect(mockOpenLessonById).toHaveBeenCalledWith('101');
  });
});
