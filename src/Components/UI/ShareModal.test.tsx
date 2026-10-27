// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ShareModal from './ShareModal';
import * as clipboard from '../../utils/clipboard';

vi.mock('../../utils/clipboard', () => ({
  copyText: vi.fn().mockResolvedValue(true),
}));

describe('ShareModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'المسألة الأولى: أحكام المياه',
    cleanUrl: 'https://example.com/lessons/1/',
    shareText: '«المسألة الأولى: أحكام المياه»\n\nنص المسألة الفقهية',
    onDownloadImage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<ShareModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(defaultProps.title)).toBeNull();
  });

  it('renders modal content and title when isOpen is true', () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByText(defaultProps.title)).toBeDefined();
    expect(screen.getByText(/مشاركة عبر واتساب/i)).toBeDefined();
    expect(screen.getByText(/مشاركة عبر تليجرام/i)).toBeDefined();
    expect(screen.getByText(/نشر على منصة إكس/i)).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ShareModal {...defaultProps} />);
    const closeBtn = screen.getByRole('button', { name: /إغلاق/i });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('opens WhatsApp share URL with encoded text and clean url', () => {
    render(<ShareModal {...defaultProps} />);
    const whatsappBtn = screen.getByText(/مشاركة عبر واتساب/i).closest('button')!;
    fireEvent.click(whatsappBtn);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://api.whatsapp.com/send?text='),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('opens Telegram share URL with encoded params', () => {
    render(<ShareModal {...defaultProps} />);
    const telegramBtn = screen.getByText(/مشاركة عبر تليجرام/i).closest('button')!;
    fireEvent.click(telegramBtn);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://t.me/share/url?url='),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('opens Twitter/X share URL with encoded params', () => {
    render(<ShareModal {...defaultProps} />);
    const xBtn = screen.getByText(/نشر على منصة إكس/i).closest('button')!;
    fireEvent.click(xBtn);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://twitter.com/intent/tweet?text='),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('copies full text and clean URL, then shows success feedback', async () => {
    render(<ShareModal {...defaultProps} />);
    const copyBtn = screen.getByText(/نسخ نص المسألة مع الرابط/i).closest('button')!;
    fireEvent.click(copyBtn);

    expect(clipboard.copyText).toHaveBeenCalledWith(
      expect.stringContaining(defaultProps.cleanUrl)
    );

    await waitFor(() => {
      expect(screen.getByText('تم نسخ النص والرابط!')).toBeDefined();
    });
  });

  it('triggers onDownloadImage and closes modal when clicking save as image', () => {
    render(<ShareModal {...defaultProps} />);
    const downloadBtn = screen.getByRole('button', { name: /حفظ كصورة/i });
    fireEvent.click(downloadBtn);

    expect(defaultProps.onDownloadImage).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('triggers native share when navigator.share is available', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    });

    render(<ShareModal {...defaultProps} />);
    const nativeBtn = screen.getByText(/نافذة مشاركة النظام الأصلية/i).closest('button');
    expect(nativeBtn).not.toBeNull();

    if (nativeBtn) {
      fireEvent.click(nativeBtn);
      expect(mockShare).toHaveBeenCalledWith({
        title: defaultProps.title,
        text: defaultProps.shareText,
        url: defaultProps.cleanUrl,
      });
    }
  });
});
