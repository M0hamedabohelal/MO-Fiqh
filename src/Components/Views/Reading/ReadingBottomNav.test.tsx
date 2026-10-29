// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReadingBottomNav } from './ReadingBottomNav';

describe('ReadingBottomNav Component', () => {
  afterEach(() => {
    cleanup();
  });

  const baseProps = {
    currentIndex: 5,
    totalLessons: 85,
    pageNumber: 23,
    canGoPrev: true,
    canGoNext: true,
    onPrev: vi.fn(),
    onNext: vi.fn(),
  };

  it('يعرض رقم المسألة وإجمالي المسائل ورقم الصفحة بشكل سليم ومنفصل', () => {
    render(<ReadingBottomNav {...baseProps} />);

    expect(screen.getByText(/المسألة 6 من 85/i)).toBeTruthy();
    expect(screen.getByText(/صفحة 23/i)).toBeTruthy();
  });

  it('لا يعرض عنصر الصفحة إذا لم تكن متوفرة أو فارغة', () => {
    render(<ReadingBottomNav {...baseProps} pageNumber={null} />);

    expect(screen.getByText(/المسألة 6 من 85/i)).toBeTruthy();
    expect(screen.queryByText(/صفحة/i)).toBeNull();
  });

  it('يستدعي onPrev عند النقر على زر المسألة السابقة', () => {
    const onPrev = vi.fn();
    render(<ReadingBottomNav {...baseProps} onPrev={onPrev} />);

    const prevBtn = screen.getByRole('button', { name: /المسألة السابقة/i }) as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(false);
    fireEvent.click(prevBtn);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('يُعطّل زر المسألة السابقة عندما canGoPrev = false', () => {
    const onPrev = vi.fn();
    render(<ReadingBottomNav {...baseProps} canGoPrev={false} onPrev={onPrev} />);

    const prevBtn = screen.getByRole('button', { name: /المسألة السابقة/i }) as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
    fireEvent.click(prevBtn);
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('يستدعي onNext عند النقر على زر المسألة التالية', () => {
    const onNext = vi.fn();
    render(<ReadingBottomNav {...baseProps} onNext={onNext} />);

    const nextBtn = screen.getByRole('button', { name: /المسألة التالية/i }) as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(false);
    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('يُعطّل زر المسألة التالية عندما canGoNext = false', () => {
    const onNext = vi.fn();
    render(<ReadingBottomNav {...baseProps} canGoNext={false} onNext={onNext} />);

    const nextBtn = screen.getByRole('button', { name: /المسألة التالية/i }) as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
    fireEvent.click(nextBtn);
    expect(onNext).not.toHaveBeenCalled();
  });
});
