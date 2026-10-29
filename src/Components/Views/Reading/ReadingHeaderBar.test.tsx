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
    const desktopTitle = screen.getByText('المسألة الأولى: الماء الطهور');
    expect(desktopTitle.className).toContain('opacity-0');
    expect(desktopTitle.getAttribute('aria-hidden')).toBe('true');
  });

  it('يُبرز عنوان المسألة المثبت على الشاشات الكبيرة والمحمولة عند التمرير (isScrolled = true)', () => {
    render(<ReadingHeaderBar {...defaultProps} isScrolled={true} />);

    const titles = screen.getAllByText('المسألة الأولى: الماء الطهور');
    // عنصر للشاشات الكبيرة وآخر للموبايل
    expect(titles.length).toBeGreaterThanOrEqual(1);

    const desktopTitle = titles.find((el) => el.classList.contains('reading-sticky-title'));
    expect(desktopTitle).toBeTruthy();
    expect(desktopTitle?.className).toContain('opacity-100');
    expect(desktopTitle?.getAttribute('aria-hidden')).toBe('false');

    const mobileTitle = titles.find((el) => el.classList.contains('reading-sticky-title-mobile'));
    expect(mobileTitle).toBeTruthy();
  });

  it('الضغط على عنوان المسألة المثبت يصعد بالصفحة لأعلى بنعومة', () => {
    render(<ReadingHeaderBar {...defaultProps} isScrolled={true} />);

    const titles = screen.getAllByText('المسألة الأولى: الماء الطهور');
    const desktopTitle = titles.find((el) => el.classList.contains('reading-sticky-title'));
    expect(desktopTitle).toBeTruthy();

    fireEvent.click(desktopTitle!);
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
