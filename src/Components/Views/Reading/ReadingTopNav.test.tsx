// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReadingTopNav } from './ReadingTopNav';

describe('ReadingTopNav Component', () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    currentIndex: 3,
    totalLessons: 10,
    canGoPrev: true,
    canGoNext: true,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    prevLessonTitle: 'الشروط',
    nextLessonTitle: 'الأركان',
  };

  it('يعرض مؤشر رقم المسألة وزري السابق والتالي بشكل صحيح', () => {
    render(<ReadingTopNav {...defaultProps} />);

    expect(screen.getByText('المسألة 4 من 10')).toBeTruthy();
    expect(screen.getByRole('button', { name: /المسألة السابقة/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /المسألة التالية/i })).toBeTruthy();
  });

  it('يستجيب للنقر على زر المسألة السابقة والتالية', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    render(<ReadingTopNav {...defaultProps} onPrev={onPrev} onNext={onNext} />);

    const prevBtn = screen.getByRole('button', { name: /المسألة السابقة/i });
    const nextBtn = screen.getByRole('button', { name: /المسألة التالية/i });

    fireEvent.click(prevBtn);
    expect(onPrev).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('يُعطّل زر السابقة عندما تكون canGoPrev=false', () => {
    const onPrev = vi.fn();
    render(<ReadingTopNav {...defaultProps} canGoPrev={false} onPrev={onPrev} />);

    const prevBtn = screen.getByRole('button', { name: /المسألة السابقة/i }) as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);

    fireEvent.click(prevBtn);
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('يُعطّل زر التالية عندما تكون canGoNext=false', () => {
    const onNext = vi.fn();
    render(<ReadingTopNav {...defaultProps} canGoNext={false} onNext={onNext} />);

    const nextBtn = screen.getByRole('button', { name: /المسألة التالية/i }) as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);

    fireEvent.click(nextBtn);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('يعرض عناوين المسائل السابقة والتالية كمعاينة وتلميح', () => {
    render(<ReadingTopNav {...defaultProps} />);

    expect(screen.getByText('الشروط')).toBeTruthy();
    expect(screen.getByText('الأركان')).toBeTruthy();
  });
});
