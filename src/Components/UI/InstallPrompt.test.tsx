// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { InstallPrompt } from './InstallPrompt';
import * as pwaHook from '../../hooks/usePWAInstall';

describe('InstallPrompt Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('لا يظهر إن كان التطبيق غير قابل للتثبيت', () => {
    vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
      isInstallable: false,
      isInstalled: false,
      isIOS: false,
      isDismissed: false,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
    });

    const { container } = render(<InstallPrompt />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(container.firstChild).toBeNull();
  });

  it('يظهر بعد المهلة الزمنية إن كان قابلاً للتثبيت', () => {
    vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      isIOS: false,
      isDismissed: false,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
    });

    const { container } = render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('تثبيت تطبيق «يَسِّر»')).not.toBeNull();
    expect(screen.getByText('تثبيت التطبيق')).not.toBeNull();
    expect(container.querySelector('aside')).not.toBeNull();
  });

  it('النقر على تثبيت يستدعي promptInstall', async () => {
    const promptMock = vi.fn().mockResolvedValue('accepted');
    vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      isIOS: false,
      isDismissed: false,
      promptInstall: promptMock,
      dismissPrompt: vi.fn(),
    });

    render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const installBtn = screen.getByText('تثبيت التطبيق');
    await act(async () => {
      installBtn.click();
    });

    expect(promptMock).toHaveBeenCalledTimes(1);
  });

  it('النقر على لاحقاً يستدعي dismissPrompt', () => {
    const dismissMock = vi.fn();
    vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      isIOS: false,
      isDismissed: false,
      promptInstall: vi.fn(),
      dismissPrompt: dismissMock,
    });

    render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const laterBtn = screen.getByText('لاحقاً');
    act(() => {
      laterBtn.click();
    });

    expect(dismissMock).toHaveBeenCalledTimes(1);
  });

  it('يعرض إرشادات iOS في أجهزة أبل', () => {
    vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      isIOS: true,
      isDismissed: false,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
    });

    render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/للتثبيت على جهاز iPhone أو iPad:/)).not.toBeNull();
    expect(screen.getByText('فهمت ذلك')).not.toBeNull();
  });
});
