// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import QuoteCard from './QuoteCard';
import * as clipboard from '../../utils/clipboard';

describe('QuoteCard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض نص المسألة بشكل سليم مع زر النسخ', () => {
    render(
      <QuoteCard
        text="الماء طهور لا ينجسه شيء إلا ما غلب على ريحه أو طعمه أو لونه"
        searchQuery=""
      />
    );

    expect(screen.getByText(/الماء طهور لا ينجسه شيء/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /نسخ نص المسألة/i })).toBeTruthy();
  });

  it('الضغط على زر النسخ يستدعي copyText ويُظهر أيقونة النجاح', async () => {
    vi.useFakeTimers();
    const copySpy = vi.spyOn(clipboard, 'copyText').mockResolvedValue(true);

    render(
      <QuoteCard
        text="نص تجريبي للنسخ"
        searchQuery=""
      />
    );

    const copyBtn = screen.getByRole('button', { name: /نسخ نص المسألة/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(copySpy).toHaveBeenCalledWith('نص تجريبي للنسخ');
    const checkIcon = copyBtn.querySelector('svg');
    expect(checkIcon).toBeTruthy();
    expect(checkIcon?.getAttribute('stroke')).toBe('currentColor');

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    vi.useRealTimers();
  });

  it('يُحلل الروابط التشعبية للمسائل الأخرى [نص](lesson:ID) ويحوّلها لرابط تنقل', () => {
    render(
      <QuoteCard
        text="حكم المسألة: كما تقدّم بيانه في [شروط الصلاة](lesson:15) بالتفصيل."
        searchQuery=""
        glossary={{}}
      />
    );

    const link = screen.getByRole('link', { name: /شروط الصلاة/i }) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('#/lesson/15');
  });

  it('يُبرز مصطلحات القاموس كأزرار قابلة للضغط', () => {
    const customGlossary = {
      'الطهور': 'الماء الباقي على خلقته الأصلية المطلقة',
    };

    render(
      <QuoteCard
        text="الماء الطهور طاهر في نفسه مطهر لغيره"
        searchQuery=""
        glossary={customGlossary}
      />
    );

    const term = screen.getByRole('button', { name: /تعريف مصطلح: الطهور/i });
    expect(term).toBeTruthy();
  });
});
