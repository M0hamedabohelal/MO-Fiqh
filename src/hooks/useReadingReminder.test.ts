// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useReadingReminder,
  REMINDER_ENABLED_KEY,
  REMINDER_TIME_KEY,
} from './useReadingReminder';
import { safeSet, safeRemove } from '../utils/safeStorage';

describe('useReadingReminder hook', () => {
  let originalNotification: typeof Notification;

  beforeEach(() => {
    safeRemove(REMINDER_ENABLED_KEY);
    safeRemove(REMINDER_TIME_KEY);

    originalNotification = window.Notification;

    // Mock Notification
    const mockNotificationFn = vi.fn() as unknown as typeof Notification;
    Object.defineProperty(mockNotificationFn, 'permission', {
      value: 'default',
      writable: true,
      configurable: true,
    });
    mockNotificationFn.requestPermission = vi.fn(async (): Promise<NotificationPermission> => 'granted');

    window.Notification = mockNotificationFn;
  });

  afterEach(() => {
    window.Notification = originalNotification;
    safeRemove(REMINDER_ENABLED_KEY);
    safeRemove(REMINDER_TIME_KEY);
  });

  it('initializes with default state when permission is default', () => {
    const { result } = renderHook(() => useReadingReminder(3));

    expect(result.current.isSupported).toBe(true);
    expect(result.current.permission).toBe('default');
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.preferredTime).toBe('20:00');
  });

  it('enables reminder after requesting permission', async () => {
    const { result } = renderHook(() => useReadingReminder(5));

    let success = false;
    await act(async () => {
      success = await result.current.enableReminder();
    });

    expect(success).toBe(true);
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.permission).toBe('granted');
  });

  it('disables reminder when disableReminder is called', async () => {
    safeSet(REMINDER_ENABLED_KEY, 'true');
    Object.defineProperty(window.Notification, 'permission', { value: 'granted' });

    const { result } = renderHook(() => useReadingReminder(5));
    expect(result.current.isEnabled).toBe(true);

    act(() => {
      result.current.disableReminder();
    });

    expect(result.current.isEnabled).toBe(false);
  });

  it('updates preferred time correctly', () => {
    const { result } = renderHook(() => useReadingReminder(5));

    act(() => {
      result.current.setPreferredTime('21:30');
    });

    expect(result.current.preferredTime).toBe('21:30');
  });

  it('triggers test reminder if permission is granted', () => {
    Object.defineProperty(window.Notification, 'permission', { value: 'granted' });
    const { result } = renderHook(() => useReadingReminder(7));

    let triggered = false;
    act(() => {
      triggered = result.current.triggerTestReminder();
    });

    expect(triggered).toBe(true);
  });
});
