// @vitest-environment jsdom
// بوب التحديث: يظهر فجأة أسفل الشاشة بأنيميشن بسيط، ويحترم تفضيل تقليل الحركة.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import UpdateBanner from './UpdateBanner';
import type { AppVersionState } from '../../hooks/useAppVersion';

const base = (over: Partial<AppVersionState> = {}): AppVersionState => ({
  updateReady: true,
  lastCheckedAt: Date.now(),
  checking: false,
  reloading: false,
  checkStatus: 'idle',
  checkNow: vi.fn(async () => true),
  checkAndReload: vi.fn(async () => true),
  reloadNow: vi.fn(),
  dismiss: vi.fn(),
  dismissed: false,
  bootBuild: 'assets/index-OLD.js',
  runningBuild: 'assets/index-OLD.js',
  ...over,
});

describe('UpdateBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('لا يعرض شيئًا قبل ظهور النشر', () => {
    const { container } = render(<UpdateBanner version={base({ updateReady: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it('يظهر أسفل الشاشة كبوب (لا شريط أعلى) وبعد مهلة قصيرة', () => {
    const { container } = render(<UpdateBanner version={base()} />);
    // الفقاعة لا تُرسم في أول إطار — تظهر «فجأة» بعد مهلة قصيرة
    expect(container.querySelector('.update-pop')).toBeNull();

    act(() => { vi.advanceTimersByTime(400); });

    const pop = container.querySelector('.update-pop');
    expect(pop).not.toBeNull();
    expect(pop?.getAttribute('data-placement')).toBe('bottom');
  });

  it('التحديث يستدعي reloadNow', () => {
    const version = base();
    render(<UpdateBanner version={version} />);
    act(() => { vi.advanceTimersByTime(400); });
    (screen.getByRole('button', { name: /تحديث الآن/ }) as HTMLButtonElement).click();
    expect(version.reloadNow).toHaveBeenCalledTimes(1);
  });

  it('حالة reloading تُعطّل الأزرار وتعرض جارٍ التحديث', () => {
    const version = base({ reloading: true });
    render(<UpdateBanner version={version} />);
    act(() => { vi.advanceTimersByTime(400); });
    const btn = screen.getByRole('button', { name: /تحديث الآن/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('جارٍ التحديث...');
  });

  it('الإغلاق يستدعي dismiss', () => {
    const version = base();
    render(<UpdateBanner version={version} />);
    act(() => { vi.advanceTimersByTime(400); });
    (screen.getByRole('button', { name: /إغلاق/ }) as HTMLButtonElement).click();
    expect(version.dismiss).toHaveBeenCalledTimes(1);
  });

  it('محترم لتفضيل تقليل الحركة (لا أنيميشن دخول)', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
    const { container } = render(<UpdateBanner version={base()} />);
    act(() => { vi.advanceTimersByTime(400); });
    const pop = container.querySelector('.update-pop');
    expect(pop?.getAttribute('data-reduced-motion')).toBe('true');
    vi.unstubAllGlobals();
  });

  it('بعد الإخفاء لا يظهر مجددًا', () => {
    const { container } = render(<UpdateBanner version={base({ dismissed: true })} />);
    act(() => { vi.advanceTimersByTime(400); });
    expect(container.querySelector('.update-pop')).toBeNull();
  });
});
