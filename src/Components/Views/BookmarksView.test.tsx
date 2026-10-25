// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BookmarksView from './BookmarksView';
import type { Lesson } from '../../types';

const mockOpenLessonById = vi.fn();
const mockSetCurrentView = vi.fn();

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
});
