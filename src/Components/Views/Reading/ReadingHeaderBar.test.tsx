// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReadingHeaderBar } from './ReadingHeaderBar';

describe('ReadingHeaderBar Component', () => {
  const defaultProps = {
    onBackToIndex: vi.fn(),
    isRead: false,
    onToggleRead: vi.fn(),
    onPrintChapter: vi.fn(),
    fontSize: 18,
    setFontSize: vi.fn(),
    isBookmarked: false,
    onToggleBookmark: vi.fn(),
    lessonTitle: 'المسألة الأولى: الماء الطهور',
    isScrolled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض شريط الأدوات دون إبراز عنوان المسألة المثبت قبل التمرير', () => {
    render(<ReadingHeaderBar {...defaultProps} isScrolled={false} />);

    expect(screen.getByLabelText('العودة لفهرس المسائل')).toBeTruthy();
    const title = screen.getByText('المسألة الأولى: الماء الطهور');
    const band = title.closest('.reading-sticky-title-band');
    expect(band?.className).toContain('opacity-0');
    expect(band?.getAttribute('aria-hidden')).toBe('true');
  });

  it('يُبرز عنوان المسألة المثبت في شريط مخصص عند التمرير (isScrolled = true)', () => {
    render(<ReadingHeaderBar {...defaultProps} isScrolled={true} />);

    const title = screen.getByText('المسألة الأولى: الماء الطهور');
    expect(title).toBeTruthy();
    expect(title.classList.contains('reading-sticky-title')).toBe(true);

    const band = title.closest('.reading-sticky-title-band');
    expect(band?.className).toContain('opacity-100');
    expect(band?.getAttribute('aria-hidden')).toBe('false');
  });

  it('الضغط على عنوان المسألة المثبت يصعد بالصفحة لأعلى بنعومة', () => {
    render(<ReadingHeaderBar {...defaultProps} isScrolled={true} />);

    const title = screen.getByText('المسألة الأولى: الماء الطهور');
    expect(title).toBeTruthy();

    fireEvent.click(title);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('أزرار التفاعل (الرجوع، التكبير/التصغير، المفضلة، الإتمام) تعمل كما هو متوقع', () => {
    const onBack = vi.fn();
    const onToggleBookmark = vi.fn();
    const onToggleRead = vi.fn();

    render(
      <ReadingHeaderBar
        {...defaultProps}
        onBackToIndex={onBack}
        onToggleBookmark={onToggleBookmark}
        onToggleRead={onToggleRead}
      />
    );

    fireEvent.click(screen.getByLabelText('العودة لفهرس المسائل'));
    expect(onBack).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('حفظ في المفضلة'));
    expect(onToggleBookmark).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('تعليم المسألة كمقروءة'));
    expect(onToggleRead).toHaveBeenCalled();
  });
});
