// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import QuoteImageModal from './QuoteImageModal';

describe('QuoteImageModal Component', () => {
  const defaultProps = {
    show: true,
    text: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى',
    source: 'كتاب الطهارة • المسألة الأولى',
    onClose: vi.fn(),
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('لا يصيّر شيئاً عندما تكون show=false', () => {
    const { container } = render(<QuoteImageModal {...defaultProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('يعرض نص الفائدة ومصدرها والعلامة المائية', () => {
    render(<QuoteImageModal {...defaultProps} />);
    expect(screen.queryByText(/إنما الأعمال بالنيات/)).not.toBeNull();
    expect(screen.queryByText(/كتاب الطهارة • المسألة الأولى/)).not.toBeNull();
    expect(screen.queryByText('يَسِّر')).not.toBeNull();
    expect(screen.queryByText('fqh.me')).not.toBeNull();
  });

  it('يعرض خيارات القوالب الثلاثة (كلاسيكي ذهبي، داكن عصري، ورقي تراثي)', () => {
    render(<QuoteImageModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'كلاسيكي ذهبي' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'داكن عصري' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'ورقي تراثي' })).toBeDefined();
  });

  it('يعرض خيارات المقاسات الثلاثة (مربع 1:1، ستوري 9:16، أفقي 16:9)', () => {
    render(<QuoteImageModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'مربع 1:1' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'ستوري 9:16' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'أفقي 16:9' })).toBeDefined();
  });

  it('الضغط على أزرار القوالب والمقاسات يغيّر الحالة دون أخطاء', () => {
    render(<QuoteImageModal {...defaultProps} />);
    const modernBtn = screen.getByRole('button', { name: 'داكن عصري' });
    const parchmentBtn = screen.getByRole('button', { name: 'ورقي تراثي' });
    const storyBtn = screen.getByRole('button', { name: 'ستوري 9:16' });
    const landscapeBtn = screen.getByRole('button', { name: 'أفقي 16:9' });

    fireEvent.click(modernBtn);
    fireEvent.click(parchmentBtn);
    fireEvent.click(storyBtn);
    fireEvent.click(landscapeBtn);

    // التحقق من بقاء أزرار الإجراءات الفعالة
    expect(screen.queryByRole('button', { name: /مشاركة مباشرة/ })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /تنزيل/ })).not.toBeNull();
  });

  it('الضغط على زر الإغلاق يستدعي onClose', () => {
    const onClose = vi.fn();
    render(<QuoteImageModal {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByLabelText('إغلاق');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
