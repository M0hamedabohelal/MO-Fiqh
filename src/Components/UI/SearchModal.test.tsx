// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import SearchModal from './SearchModal';
import type { Lesson } from '../../types';

const sampleLessons: Lesson[] = [
  {
    id: 1,
    title: 'المسألة الأولى: أحكام المياه',
    bookName: 'كتاب الطهارة',
    chapterName: 'باب المياه',
    mainText: 'الماء طهور لا ينجسه شيء',
  },
  {
    id: 2,
    title: 'المسألة الثانية: الماء النجس',
    bookName: 'كتاب الطهارة',
    chapterName: 'باب المياه',
    mainText: 'إذا وقعت فيه نجاسة فغيرت طعمه أو لونه',
  },
  {
    id: 3,
    title: 'المسألة الثالثة: شروط الصلاة',
    bookName: 'كتاب الصلاة',
    chapterName: 'باب الصلاة',
    mainText: 'من شروط الصلاة استقبال القبلة والنية',
  },
];

describe('SearchModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('لا يعرض النافذة إذا كان isOpen = false', () => {
    const { container } = render(
      <SearchModal isOpen={false} onClose={vi.fn()} data={sampleLessons} onSelect={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('يعرض النافذة وحقل البحث عند isOpen = true', () => {
    render(
      <SearchModal isOpen={true} onClose={vi.fn()} data={sampleLessons} onSelect={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText(/عنوان، نص، رقم المسألة/i)).toBeTruthy();
  });

  it('يعرض سجل عمليات البحث السابقة عند توفرها في التخزين المحلي', () => {
    localStorage.setItem('recent_searches', JSON.stringify(['الطهارة', 'الماء النجس']));

    render(
      <SearchModal isOpen={true} onClose={vi.fn()} data={sampleLessons} onSelect={vi.fn()} />,
    );

    expect(screen.getByText('عمليات البحث الأخيرة')).toBeTruthy();
    expect(screen.getByText('الطهارة')).toBeTruthy();
    expect(screen.getByText('الماء النجس')).toBeTruthy();
  });

  it('النقر على عنصر من السجل يملأ حقل البحث', async () => {
    localStorage.setItem('recent_searches', JSON.stringify(['الطهارة']));

    render(
      <SearchModal isOpen={true} onClose={vi.fn()} data={sampleLessons} onSelect={vi.fn()} />,
    );

    const termBtn = screen.getByRole('button', { name: 'البحث عن "الطهارة"' });
    fireEvent.click(termBtn);

    const input = screen.getByPlaceholderText(/عنوان، نص، رقم المسألة/i) as HTMLInputElement;
    expect(input.value).toBe('الطهارة');
  });

  it('حذف عنصر محدد من السجل يزيله من القائمة والتخزين', () => {
    localStorage.setItem('recent_searches', JSON.stringify(['الطهارة', 'الوضوء']));

    render(
      <SearchModal isOpen={true} onClose={vi.fn()} data={sampleLessons} onSelect={vi.fn()} />,
    );

    const deleteBtn = screen.getByRole('button', { name: 'حذف "الطهارة" من السجل' });
    fireEvent.click(deleteBtn);

    expect(screen.queryByText('الطهارة')).toBeNull();
    expect(screen.getByText('الوضوء')).toBeTruthy();

    const stored = JSON.parse(localStorage.getItem('recent_searches') || '[]');
    expect(stored).toEqual(['الوضوء']);
  });

  it('النقر على مسح السجل يفرغ سجل البحث كاملاً', () => {
    localStorage.setItem('recent_searches', JSON.stringify(['الطهارة', 'الوضوء']));

    render(
      <SearchModal isOpen={true} onClose={vi.fn()} data={sampleLessons} onSelect={vi.fn()} />,
    );

    const clearBtn = screen.getByRole('button', { name: 'مسح سجل البحث بالكامل' });
    fireEvent.click(clearBtn);

    expect(screen.queryByText('عمليات البحث الأخيرة')).toBeNull();
    expect(localStorage.getItem('recent_searches')).toBe('[]');
  });

  it('اختيار نتيجة من البحث يحفظ الكلمة في السجل ويستدعي onSelect', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <SearchModal isOpen={true} onClose={onClose} data={sampleLessons} onSelect={onSelect} />,
    );

    const input = screen.getByPlaceholderText(/عنوان، نص، رقم المسألة/i);
    fireEvent.change(input, { target: { value: 'القبلة' } });

    await waitFor(() => {
      expect(screen.getByText('المسألة الثالثة: شروط الصلاة')).toBeTruthy();
    });

    const resultBtn = screen.getByText('المسألة الثالثة: شروط الصلاة').closest('button');
    expect(resultBtn).toBeTruthy();
    if (resultBtn) {
      fireEvent.click(resultBtn);
    }

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3 }),
      'القبلة',
    );
    expect(onClose).toHaveBeenCalled();

    const stored = JSON.parse(localStorage.getItem('recent_searches') || '[]');
    expect(stored).toContain('القبلة');
  });
});
