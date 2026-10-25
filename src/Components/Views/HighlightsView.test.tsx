// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import HighlightsView from './HighlightsView';
import type { HighlightItem, Lesson } from '../../types';
import * as libraryBackup from '../../utils/libraryBackup';

const mockDeleteHighlight = vi.fn();
const mockOpenLessonById = vi.fn();
const mockRestoreLibrary = vi.fn();

const sampleLessons: Lesson[] = [
  {
    id: 1,
    title: 'المسألة الأولى: أحكام المياه',
    bookName: 'كتاب الطهارة',
    chapterName: 'باب المياه',
    mainText: 'نص المسألة',
  },
];

const sampleHighlights: HighlightItem[] = [
  {
    id: 'h-1',
    text: 'الماء الطهور هو الباقي على أصله',
    title: 'فائدة نفيسة',
    lessonId: 1,
    bookName: 'كتاب الطهارة',
  },
];

let mockHighlights: HighlightItem[] = [];
let mockNotes: Record<string, string> = {};

vi.mock('../Layout/AppContext', () => ({
  useApp: () => ({
    bookmarks: [],
    readLessons: [],
    highlights: mockHighlights,
    notes: mockNotes,
    stopMarks: {},
    lessons: sampleLessons,
    deleteHighlight: mockDeleteHighlight,
    openLessonById: mockOpenLessonById,
    restoreLibrary: mockRestoreLibrary,
  }),
}));

vi.mock('../../utils/libraryBackup', () => ({
  buildBackup: vi.fn(() => ({ version: 1, bookmarks: [], highlights: [], notes: {}, readLessons: [], stopMarks: {} })),
  downloadBackup: vi.fn(),
  parseBackupFile: vi.fn(),
  backupToText: vi.fn(() => 'backup text'),
}));

vi.mock('../UI/ShareButton', () => ({
  default: () => <div data-testid="share-button">Share</div>,
}));

describe('HighlightsView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHighlights = [];
    mockNotes = {};
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض شاشة فارغة عند عدم وجود فوائد أو ملاحظات', () => {
    render(<HighlightsView />);

    expect(screen.getByText('لا توجد فوائد مقتبسة بعد')).toBeTruthy();
  });

  it('يعرض بطاقة الفائدة المقتبسة بنجاح', () => {
    mockHighlights = [...sampleHighlights];

    render(<HighlightsView />);

    expect(screen.getByText('فائدة نفيسة')).toBeTruthy();
    expect(screen.getByText(/"الماء الطهور هو الباقي على أصله"/)).toBeTruthy();
  });

  it('الضغط على زر النسخة الاحتياطية يستدعي downloadBackup', () => {
    mockHighlights = [...sampleHighlights];

    render(<HighlightsView />);

    const backupBtn = screen.getByTitle('تنزيل نسخة احتياطية JSON');
    expect(backupBtn).toBeTruthy();

    fireEvent.click(backupBtn);
    expect(libraryBackup.downloadBackup).toHaveBeenCalled();
  });

  it('الضغط على حذف الفائدة يستدعي deleteHighlight', () => {
    mockHighlights = [...sampleHighlights];

    render(<HighlightsView />);

    const deleteBtn = screen.getByTitle('حذف الفائدة');
    expect(deleteBtn).toBeTruthy();

    fireEvent.click(deleteBtn);
    expect(mockDeleteHighlight).toHaveBeenCalledWith('h-1');
  });

  it('الضغط على الذهاب للمسألة يستدعي openLessonById', () => {
    mockHighlights = [...sampleHighlights];

    render(<HighlightsView />);

    const lessonLink = screen.getByText(/الذهاب للمسألة/);
    expect(lessonLink).toBeTruthy();

    fireEvent.click(lessonLink);
    expect(mockOpenLessonById).toHaveBeenCalledWith(1);
  });
});
