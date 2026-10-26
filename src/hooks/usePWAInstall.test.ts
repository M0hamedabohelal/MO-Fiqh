// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePWAInstall } from './usePWAInstall';

describe('usePWAInstall Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('يبدأ بحالة غير مثبت وغير قابل للتثبيت حتى يقع حدث beforeinstallprompt', () => {
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isInstallable).toBe(false);
  });

  it('يتفاعل مع حدث beforeinstallprompt ويصبح قابلاً للتثبيت', () => {
    const { result } = renderHook(() => usePWAInstall());

    const event = new Event('beforeinstallprompt');
    Object.assign(event, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(result.current.isInstallable).toBe(true);
  });

  it('تنفيذ promptInstall بنجاح يحدّث حالة التثبيت', async () => {
    const { result } = renderHook(() => usePWAInstall());

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt');
    Object.assign(event, {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });

    act(() => {
      window.dispatchEvent(event);
    });

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('accepted');
    expect(result.current.isInstalled).toBe(true);
  });

  it('حفظ التجاهل عبر dismissPrompt يخزّن في localStorage', () => {
    const { result } = renderHook(() => usePWAInstall());
    act(() => {
      result.current.dismissPrompt();
    });

    expect(result.current.isDismissed).toBe(true);
    expect(localStorage.getItem('yasser_pwa_install_dismissed')).toBe('true');
  });

  it('كشف وضع standalone من البداية يجعل isInstalled=true', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('standalone'),
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallable).toBe(false);
  });
});
