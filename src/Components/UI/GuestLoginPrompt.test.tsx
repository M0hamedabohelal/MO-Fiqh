// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import GuestLoginPrompt from './GuestLoginPrompt';
import { requireLogin, __resetGuestPromptForTests, setPendingAction, executePendingAction } from '../../utils/guestPrompt';

describe('GuestLoginPrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    __resetGuestPromptForTests();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('لا يعرض شيئًا في البداية قبل طلب تسجيل الدخول', () => {
    const onOpenLogin = vi.fn();
    const { container } = render(<GuestLoginPrompt onOpenLogin={onOpenLogin} />);
    expect(container.firstChild).toBeNull();
  });

  it('يظهر البوب عند استدعاء requireLogin مع نص الإجراء الافتراضي', () => {
    const onOpenLogin = vi.fn();
    const { container } = render(<GuestLoginPrompt onOpenLogin={onOpenLogin} />);

    act(() => {
      requireLogin({ action: 'المفضلة' });
    });

    const pop = container.querySelector('.guest-pop');
    expect(pop).not.toBeNull();
    expect(pop?.getAttribute('data-placement')).toBe('bottom');
    expect(screen.getByText('يلزم تسجيل الدخول')).toBeDefined();
    expect(screen.getByText(/سجّل الدخول لحفظ المفضلة ومزامنتها على كل أجهزتك/)).toBeDefined();
  });

  it('يعرض الرسالة المخصصة عند تمرير message', () => {
    const onOpenLogin = vi.fn();
    render(<GuestLoginPrompt onOpenLogin={onOpenLogin} />);

    act(() => {
      requireLogin({ message: 'تنبيه مخصص للزائر' });
    });

    expect(screen.getByText('تنبيه مخصص للزائر')).toBeDefined();
  });

  it('زر «تسجيل الدخول» يستدعي onOpenLogin ويُخفي التنبيه', () => {
    const onOpenLogin = vi.fn();
    const { container } = render(<GuestLoginPrompt onOpenLogin={onOpenLogin} />);

    act(() => {
      requireLogin({ action: 'الملاحظات' });
    });

    const loginBtn = screen.getByRole('button', { name: 'تسجيل الدخول' });
    act(() => {
      loginBtn.click();
    });

    expect(onOpenLogin).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toBeNull();
  });

  it('زر الإغلاق (X) يُخفي التنبيه ويمسح العملية المعلقة', () => {
    const onOpenLogin = vi.fn();
    const retryFn = vi.fn();
    const { container } = render(<GuestLoginPrompt onOpenLogin={onOpenLogin} />);

    act(() => {
      requireLogin({ action: 'الفوائد', retry: retryFn });
    });

    const dismissBtn = screen.getByRole('button', { name: 'إغلاق التنبيه' });
    act(() => {
      dismissBtn.click();
    });

    expect(container.firstChild).toBeNull();
    // التأكد من مسح العملية المعلقة
    executePendingAction();
    expect(retryFn).not.toHaveBeenCalled();
  });

  it('يختفي التنبيه تلقائيًا بعد مهلة AUTO_HIDE_MS (6500ms)', () => {
    const onOpenLogin = vi.fn();
    const { container } = render(<GuestLoginPrompt onOpenLogin={onOpenLogin} />);

    act(() => {
      requireLogin({ action: 'علامة الوقف' });
    });
    expect(container.querySelector('.guest-pop')).not.toBeNull();

    // تقديم الوقت لأقل من 6500ms
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(container.querySelector('.guest-pop')).not.toBeNull();

    // تقديم الوقت لتجاوز 6500ms
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(container.firstChild).toBeNull();
  });

  it('يدعم تنفيذ العملية المعلقة عند تسجيل الدخول بنجاح', () => {
    const retryFn = vi.fn();
    setPendingAction(retryFn);

    executePendingAction();
    expect(retryFn).toHaveBeenCalledTimes(1);

    // استدعاء ثانٍ لا ينفذها مرة أخرى
    executePendingAction();
    expect(retryFn).toHaveBeenCalledTimes(1);
  });
});
