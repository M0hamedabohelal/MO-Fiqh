// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import NotesCard from './NotesCard';

describe('NotesCard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض الملاحظة الابتدائية وحقل الكتابة وزر الحفظ', () => {
    const onSave = vi.fn();
    render(
      <NotesCard
        lessonId={1}
        lessonTitle="مسألة المياه"
        bookName="كتاب الطهارة"
        note="ملاحظة أولية للتجربة"
        onSave={onSave}
      />
    );

    const textarea = screen.getByRole('textbox', { name: /ملاحظاتك حول هذه المسألة/i }) as HTMLTextAreaElement;
    expect(textarea.value).toBe('ملاحظة أولية للتجربة');
    expect(screen.getByRole('button', { name: /حفظ الملاحظات/i })).toBeTruthy();
  });

  it('تعديل النص والضغط على حفظ يستدعي onSave ويُظهر حالة النجاح', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    render(
      <NotesCard
        lessonId={42}
        lessonTitle="أحكام الوضوء"
        note="نص قديم"
        onSave={onSave}
      />
    );

    const textarea = screen.getByRole('textbox', { name: /ملاحظاتك حول هذه المسألة/i });
    fireEvent.change(textarea, { target: { value: 'فائدة فقهية جديدة ومهمة' } });

    const saveButton = screen.getByRole('button', { name: /حفظ الملاحظات/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(42, 'فائدة فقهية جديدة ومهمة');
    expect(screen.getByText('تم الحفظ بنجاح ✓')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.queryByText('تم الحفظ بنجاح ✓')).toBeNull();
    vi.useRealTimers();
  });

  it('تصدير PDF وملاحظة فارغة يُظهر تنبيه تحذيري داخلي', () => {
    const onSave = vi.fn();
    render(
      <NotesCard
        lessonId={1}
        note=""
        onSave={onSave}
      />
    );

    const exportBtn = screen.getByTitle('تصدير كـ PDF');
    fireEvent.click(exportBtn);

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('الملاحظة فارغة! لا يوجد شيء لتصديره.');
  });

  it('زر حفظ الملاحظات يستخدم متغيرات التباين العالي var(--text-on-accent)', () => {
    render(
      <NotesCard
        lessonId={1}
        lessonTitle="مسألة المياه"
        onSave={vi.fn()}
      />
    );

    const saveButton = screen.getByRole('button', { name: /حفظ الملاحظات/i });
    expect(saveButton.style.backgroundColor).toBe('var(--accent-color)');
    expect(saveButton.style.color).toBe('var(--text-on-accent)');
  });
});
