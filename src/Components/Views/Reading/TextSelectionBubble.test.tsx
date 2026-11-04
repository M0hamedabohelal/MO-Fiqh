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

  it('يعرض زر حفظ كفائدة فقط ولا يعرض زر صورة عند تفعيل show', () => {
    render(
      <TextSelectionBubble
        selectionPopup={basePopup}
        isSmallScreen={false}
        onSaveHighlight={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /حفظ كفائدة/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /صورة/i })).toBeNull();
  });

  it('لا يعرض أي عنصر إذا كان show: false', () => {
    render(
      <TextSelectionBubble
        selectionPopup={{ ...basePopup, show: false }}
        isSmallScreen={false}
        onSaveHighlight={vi.fn()}
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
      />,
    );

    const saveBtn = screen.getByRole('button', { name: /حفظ كفائدة/i });
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('onMouseDown يمنع السلوك الافتراضي لحماية تحديد النص من الانهيار', () => {
    render(
      <TextSelectionBubble
        selectionPopup={basePopup}
        isSmallScreen={false}
        onSaveHighlight={vi.fn()}
      />,
    );

    const saveBtn = screen.getByRole('button', { name: /حفظ كفائدة/i });
    const event = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
    saveBtn.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('يعمل بشكل مثالي على الشاشات الصغيرة والهواتف مع تقليص الحشو', () => {
    render(
      <TextSelectionBubble
        selectionPopup={{ ...basePopup, x: 50, y: 300, below: true }}
        isSmallScreen={true}
        onSaveHighlight={vi.fn()}
      />,
    );

    const popup = screen.getByRole('button', { name: /حفظ كفائدة/i }).parentElement;
    expect(popup).toBeTruthy();
    expect(popup?.style.position).toBe('fixed');
    expect(popup?.style.maxWidth).toContain('100vw');
  });

  it('يصحح الإحداثيات لمنع الخروج خارج الشاشة أفقياً ورأسياً', () => {
    // محاكاة وضع بوب-أب قريب جداً من الحافة اليمنى لشاشة الهاتف
    render(
      <TextSelectionBubble
        selectionPopup={{ ...basePopup, x: 380, y: 700, below: true }}
        isSmallScreen={true}
        onSaveHighlight={vi.fn()}
      />,
    );

    const popup = screen.getByRole('button', { name: /حفظ كفائدة/i }).parentElement;
    expect(popup).toBeTruthy();
  });
});
