// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ReviewMode from './ReviewMode';
import { AppProvider } from '../Layout/AppContext';
import type { AppContextValue } from '../Layout/AppContext';

describe('ReviewMode Component', () => {
  const mockAppContext: Partial<AppContextValue> = {
    lessons: [
      {
        id: 1,
        title: 'المسألة الأولى',
        mainText: 'نص المتن للمسألة الأولى',
        sheikhExplanation: 'شرح المسألة الأولى للشيخ',
        bookName: 'كتاب الطهارة',
        chapterName: 'الباب الأول',
      },
    ],
    readLessons: ['1'],
    highlights: [],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('يعرض حالة فارغة عندما لا توجد مسائل مقروءة أو فوائد', () => {
    const emptyContext = { ...mockAppContext, readLessons: [], highlights: [] };
    render(
      <AppProvider value={emptyContext as unknown as AppContextValue}>
        <ReviewMode />
      </AppProvider>
    );

    expect(screen.queryByText(/لا توجد مسائل أو فوائد للمراجعة بعد/)).not.toBeNull();
  });

  it('يعرض بطاقة المراجعة مع نص المتن وزر كشف الحكم', () => {
    render(
      <AppProvider value={mockAppContext as unknown as AppContextValue}>
        <ReviewMode />
      </AppProvider>
    );

    expect(screen.queryByText('المسألة الأولى')).not.toBeNull();
    expect(screen.queryByText(/نص المتن للمسألة الأولى/)).not.toBeNull();

    const revealBtn = screen.getByRole('button', { name: /كشف الحكم والتعليق/ });
    expect(revealBtn).toBeDefined();

    fireEvent.click(revealBtn);

    // بعد الكشف يظهر الشرح والتعليق وأزرار التقييم
    expect(screen.queryByText(/شرح المسألة الأولى للشيخ/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: /أتقنت واستذكرت/ })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /أحتاج مراجعة/ })).not.toBeNull();
  });

  it('الضغط على أتقنت يُنهي الجلسة ويعرض شاشة الاحتفال', () => {
    render(
      <AppProvider value={mockAppContext as unknown as AppContextValue}>
        <ReviewMode />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /كشف الحكم والتعليق/ }));
    fireEvent.click(screen.getByRole('button', { name: /أتقنت واستذكرت/ }));

    expect(screen.queryByText(/أحسنت! أتممت جلسة المراجعة/)).not.toBeNull();
  });
});
