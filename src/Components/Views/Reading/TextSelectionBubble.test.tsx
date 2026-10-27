// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TextSelectionBubble, type SelectionPopupState } from './TextSelectionBubble';

describe('TextSelectionBubble Component', () => {
  afterEach(() => {
    cleanup();
  });

  const basePopup: SelectionPopupState = {
    show: true,
    text: 'نص فقهي محدد للاختبار',
    x: 200,
    y: 150,
    below: false,
  };

  it('يعرض أزرار حفظ كفائدة وصورة عند تفعيل show', () => {
    render(
      <TextSelectionBubble
        selectionPopup={basePopup}
        isSmallScreen={false}
        onSaveHighlight={vi.fn()}
        onOpenQuoteImage={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /حفظ كفائدة/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /صورة/i })).toBeTruthy();
  });

  it('لا يعرض أي عنصر إذا كان show: false', () => {
    render(
      <TextSelectionBubble
        selectionPopup={{ ...basePopup, show: false }}
        isSmallScreen={false}
        onSaveHighlight={vi.fn()}
        onOpenQuoteImage={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /حفظ كفائدة/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /صورة/i })).toBeNull();
  });

  it('الضغط على حفظ كفائدة يستدعي onSaveHighlight', () => {
    const onSave = vi.fn();
    render(
      <TextSelectionBubble
        selectionPopup={basePopup}
        isSmallScreen={false}
        onSaveHighlight={onSave}
        onOpenQuoteImage={vi.fn()}
      />,
    );

    const saveBtn = screen.getByRole('button', { name: /حفظ كفائدة/i });
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('الضغط على صورة يستدعي onOpenQuoteImage', () => {
    const onQuote = vi.fn();
    render(
      <TextSelectionBubble
        selectionPopup={basePopup}
        isSmallScreen={false}
        onSaveHighlight={vi.fn()}
        onOpenQuoteImage={onQuote}
      />,
    );

    const imageBtn = screen.getByRole('button', { name: /صورة/i });
    fireEvent.click(imageBtn);
    expect(onQuote).toHaveBeenCalledTimes(1);
  });

  it('onMouseDown يمنع السلوك الافتراضي لحماية تحديد النص من الانهيار', () => {
    render(
      <TextSelectionBubble
        selectionPopup={basePopup}
        isSmallScreen={false}
        onSaveHighlight={vi.fn()}
        onOpenQuoteImage={vi.fn()}
      />,
    );

    const saveBtn = screen.getByRole('button', { name: /حفظ كفائدة/i });
    const event = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
    saveBtn.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
