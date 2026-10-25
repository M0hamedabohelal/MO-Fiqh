// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireLogin, onRequireLogin, __resetGuestPromptForTests, setPendingAction, executePendingAction, clearPendingAction } from './guestPrompt';

describe('guestPrompt', () => {
  beforeEach(() => {
    __resetGuestPromptForTests();
  });

  it('يطلق حدث require-login مع التفاصيل', () => {
    const handler = vi.fn();
    const unsub = onRequireLogin(handler);

    requireLogin({ action: 'المفضلة' });
    expect(handler).toHaveBeenCalledWith({ action: 'المفضلة' });

    unsub();
  });

  it('يخنق (throttle) النداءات المتتالية السريعة لنفس الإجراء', () => {
    const handler = vi.fn();
    const unsub = onRequireLogin(handler);

    requireLogin({ action: 'المفضلة' });
    requireLogin({ action: 'المفضلة' });
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
  });

  it('يُطلق فورًا دون خنق إذا تغيّر الإجراء (مثل مفضلة ثم ملاحظة)', () => {
    const handler = vi.fn();
    const unsub = onRequireLogin(handler);

    requireLogin({ action: 'المفضلة' });
    requireLogin({ action: 'الملاحظات' });
    expect(handler).toHaveBeenCalledTimes(2);

    unsub();
  });

  it('يدعم تسجيل واستدعاء ومسح pendingAction', () => {
    const fn = vi.fn();
    setPendingAction(fn);
    executePendingAction();
    expect(fn).toHaveBeenCalledTimes(1);

    const fn2 = vi.fn();
    setPendingAction(fn2);
    clearPendingAction();
    executePendingAction();
    expect(fn2).not.toHaveBeenCalled();
  });
});
