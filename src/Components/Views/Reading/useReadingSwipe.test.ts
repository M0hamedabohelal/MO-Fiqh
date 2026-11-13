// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReadingSwipe } from './useReadingSwipe';

describe('useReadingSwipe hook', () => {
  it('يبدأ بحالة سحب افتراضية متوقفة ومسافة صفر', () => {
    const { result } = renderHook(() =>
      useReadingSwipe({
        canGoPrev: true,
        canGoNext: true,
        onPrev: vi.fn(),
        onNext: vi.fn(),
      })
    );

    expect(result.current.dragOffset).toBe(0);
    expect(result.current.isDragging).toBe(false);
  });

  it('يتجاهل الإيماءات عند عدم بلوغ مسافة العتبة المطلوبة', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    const { result } = renderHook(() =>
      useReadingSwipe({
        canGoPrev: true,
        canGoNext: true,
        onPrev,
        onNext,
      })
    );

    act(() => {
      result.current.handleTouchStart({
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      } as unknown as React.TouchEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.handleTouchEnd({
        changedTouches: [{ clientX: 120, clientY: 100 } as Touch],
      } as unknown as React.TouchEvent<HTMLDivElement>);
    });

    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
    expect(result.current.dragOffset).toBe(0);
  });

  it('يستدعي onPrev عند السحب لليمين وتجاوز العتبة مع canGoPrev = true', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    const { result } = renderHook(() =>
      useReadingSwipe({
        canGoPrev: true,
        canGoNext: true,
        onPrev,
        onNext,
      })
    );

    act(() => {
      result.current.handleTouchStart({
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      } as unknown as React.TouchEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.handleTouchEnd({
        changedTouches: [{ clientX: 180, clientY: 100 } as Touch],
      } as unknown as React.TouchEvent<HTMLDivElement>);
    });

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('يستدعي onNext عند السحب لليسار وتجاوز العتبة مع canGoNext = true', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    const { result } = renderHook(() =>
      useReadingSwipe({
        canGoPrev: true,
        canGoNext: true,
        onPrev,
        onNext,
      })
    );

    act(() => {
      result.current.handleTouchStart({
        touches: [{ clientX: 180, clientY: 100 } as Touch],
      } as unknown as React.TouchEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.handleTouchEnd({
        changedTouches: [{ clientX: 100, clientY: 100 } as Touch],
      } as unknown as React.TouchEvent<HTMLDivElement>);
    });

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();
  });
});
