// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BookmarksView from './BookmarksView';
import type { Lesson } from '../../types';

const mockOpenLessonById = vi.fn();
const mockSetCurrentView = vi.fn();
const mockExportBookmarksPrint = vi.fn();

vi.mock('../../utils/printExport', () => ({
  exportBookmarksPrint: (...args: unknown[]) => mockExportBookmarksPrint(...args),
}));

const sampleLessons: Lesson[] = [
  {
    id: 1,
    title: 'المسألة الأولى: أحكام المياه',
    bookName: 'كتاب الطهارة',
    chapterName: 'باب المياه',
    mainText: 'نص المسألة',
  },
  {
    id: 2,
    title: 'المسألة الثانية: الماء النجس',
    bookName: 'كتاب الطهارة',
    chapterName: 'باب المياه',
    mainText: 'نص المسألة 2',
  },
  {
    id: 3,
    title: 'المسألة الثالثة: أحكام الآنية',
    bookName: 'كتاب الطهارة',
    chapterName: 'باب الآنية',
    mainText: 'نص المسألة 3',
  },
  {
    id: 4,
    title: 'المسألة الرابعة: شروط الصلاة',
    bookName: 'كتاب الصلاة',
    chapterName: 'باب الصلاة',
    mainText: 'نص المسألة 4',
  },
];

let mockBookmarks: string[] = [];

vi.mock('../Layout/AppContext', () => ({
  useApp: () => ({
    bookmarks: mockBookmarks,
    highlights: [],
    lessons: sampleLessons,
    openLessonById: mockOpenLessonById,
    setCurrentView: mockSetCurrentView,
  }),
}));

describe('BookmarksView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookmarks = [];
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض شاشة فارغة عند عدم وجود أي مسائل محفوظة', () => {
    render(<BookmarksView />);

    expect(screen.getByText('لا توجد مسائل محفوظة')).toBeTruthy();
    expect(screen.getByText('تصفح الكتب')).toBeTruthy();

    fireEvent.click(screen.getByText('تصفح الكتب'));
    expect(mockSetCurrentView).toHaveBeenCalledWith('books');
  });

  it('يعرض قائمة المسائل المحفوظة في المفضلة', () => {
    mockBookmarks = ['1', '2'];

    render(<BookmarksView />);

    expect(screen.getByText('المسألة الأولى: أحكام المياه')).toBeTruthy();
    expect(screen.getByText('المسألة الثانية: الماء النجس')).toBeTruthy();
    expect(screen.queryByText('المسألة الثالثة: أحكام الآنية')).toBeNull();
  });

  it('النقر على مسألة محفوظة يستدعي openLessonById', () => {
    mockBookmarks = ['1'];

    render(<BookmarksView />);

    const itemBtn = screen.getByText('المسألة الأولى: أحكام المياه').closest('button');
    expect(itemBtn).toBeTruthy();

    if (itemBtn) {
      fireEvent.click(itemBtn);
      expect(mockOpenLessonById).toHaveBeenCalledWith(1);
    }
  });

  it('يعرض حقل البحث عند وجود أكثر من 3 مسائل ويُصفّي النتائج', () => {
    mockBookmarks = ['1', '2', '3', '4'];

    render(<BookmarksView />);

    const searchInput = screen.getByPlaceholderText('ابحث في مفضلتك...');
    expect(searchInput).toBeTruthy();

    fireEvent.change(searchInput, { target: { value: 'الآنية' } });

    expect(screen.getByText('المسألة الثالثة: أحكام الآنية')).toBeTruthy();
    expect(screen.queryByText('المسألة الأولى: أحكام المياه')).toBeNull();
  });

  it('يستدعي تصدير كراسة المراجعة للطباعة عند النقر على زر الطباعة', () => {
    mockBookmarks = ['1', '2'];

    render(<BookmarksView />);

    const printBtn = screen.getByRole('button', { name: /تصدير كراسة المراجعة/i });
    expect(printBtn).toBeTruthy();

    fireEvent.click(printBtn);
    expect(mockExportBookmarksPrint).toHaveBeenCalledTimes(1);
    expect(mockExportBookmarksPrint).toHaveBeenCalledWith({
      bookmarkedLessons: expect.arrayContaining([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
      ]),
    });
  });

  it('يعرض تصنيف المسائل تحت بطاقة الكتاب القابلة للطي', () => {
    mockBookmarks = ['1', '4']; // كتاب الطهارة وكتاب الصلاة

    render(<BookmarksView />);

    expect(screen.getByText('كتاب الطهارة')).toBeTruthy();
    expect(screen.getByText('كتاب الصلاة')).toBeTruthy();

    // طي قسم كتاب الصلاة
    const collapseBtn = screen.getByRole('button', { name: 'قسم كتاب الصلاة' });
    fireEvent.click(collapseBtn);

    // المسألة الرابعة داخل كتاب الصلاة تختفي بعد الطي
    expect(screen.queryByText('المسألة الرابعة: شروط الصلاة')).toBeNull();

    // إعادة الفتح
    fireEvent.click(collapseBtn);
    expect(screen.getByText('المسألة الرابعة: شروط الصلاة')).toBeTruthy();
  });
});
