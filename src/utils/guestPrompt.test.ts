// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireLogin, onRequireLogin, __resetGuestPromptForTests } from './guestPrompt';

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

  it('يخنق (throttle) النداءات المتتالية السريعة', () => {
    const handler = vi.fn();
    const unsub = onRequireLogin(handler);

    requireLogin({ action: 'المفضلة' });
    requireLogin({ action: 'المفضلة' });
    expect(handler).toHaveBeenCalledTimes(1);

    __resetGuestPromptForTests();
    requireLogin({ action: 'الملاحظات' });
    expect(handler).toHaveBeenCalledTimes(2);

    unsub();
  });
});
