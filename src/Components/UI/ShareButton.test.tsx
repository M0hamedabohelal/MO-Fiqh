// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ShareButton from './ShareButton';
import * as canvasUtil from '../../utils/shareCardCanvas';
import * as clipboard from '../../utils/clipboard';

vi.mock('../../utils/clipboard', () => ({
  copyText: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/shareCardCanvas', () => ({
  generateShareCanvas: vi.fn(),
}));

describe('ShareButton', () => {
  const defaultProps = {
    title: 'المسألة الأولى: أحكام المياه',
    text: 'الماء طهور لا ينجسه شيء إلا ما غلب على لونه أو طعمه أو ريحه',
    sheikhComment: 'شرح موجز لأهمية طهارة الماء',
    lessonId: 1,
  };

  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCanvas = document.createElement('canvas');
    mockCanvas.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockPng');
    vi.mocked(canvasUtil.generateShareCanvas).mockReturnValue(mockCanvas);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders download, share, and copy buttons', () => {
    render(<ShareButton {...defaultProps} />);

    expect(screen.getByRole('button', { name: /حفظ كصورة/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /مشاركة المسألة/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /نسخ الرابط/i })).toBeDefined();
  });

  it('renders compact labels when isSmall is true', () => {
    render(<ShareButton {...defaultProps} isSmall={true} />);

    expect(screen.getByRole('button', { name: /تنزيل/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /مشاركة/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /نسخ الرابط/i })).toBeDefined();
  });

  it('downloads image directly on click without opening share modal', async () => {
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ShareButton {...defaultProps} />);
    const downloadBtn = screen.getByRole('button', { name: /حفظ كصورة/i });

    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(canvasUtil.generateShareCanvas).toHaveBeenCalledWith(
        defaultProps.title,
        defaultProps.text,
        defaultProps.sheikhComment
      );
      expect(anchorClickSpy).toHaveBeenCalled();
      expect(screen.getByText('تم التحميل')).toBeDefined();
    });

    // Make sure share modal was not triggered
    expect(screen.queryByText(/اختر الوسيلة المفضلة/i)).toBeNull();
  });

  it('handles canvas failure gracefully by showing failure state', async () => {
    vi.mocked(canvasUtil.generateShareCanvas).mockImplementation(() => {
      throw new Error('Canvas render error');
    });

    render(<ShareButton {...defaultProps} />);
    const downloadBtn = screen.getByRole('button', { name: /حفظ كصورة/i });

    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(screen.getByText('فشل التوليد')).toBeDefined();
    });
  });

  it('copies clean canonical link on copy button click', async () => {
    render(<ShareButton {...defaultProps} />);
    const copyLinkBtn = screen.getByRole('button', { name: /نسخ الرابط/i });

    fireEvent.click(copyLinkBtn);

    await waitFor(() => {
      expect(clipboard.copyText).toHaveBeenCalledWith(
        expect.stringContaining('/lessons/1/')
      );
      expect(screen.getByText('نسخ')).toBeDefined();
    });
  });

  it('opens ShareModal on desktop when share button is clicked', async () => {
    render(<ShareButton {...defaultProps} />);
    const shareBtn = screen.getByRole('button', { name: /مشاركة المسألة/i });

    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(screen.getByText(/اختر الوسيلة المفضلة لمشاركة المسألة/i)).toBeDefined();
    });
  });

  it('calls navigator.share directly on mobile devices', async () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true,
      writable: true,
    });

    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    });

    render(<ShareButton {...defaultProps} />);
    const shareBtn = screen.getByRole('button', { name: /مشاركة المسألة/i });

    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          title: defaultProps.title,
          url: expect.stringContaining('/lessons/1/'),
        })
      );
    });

    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });
});
