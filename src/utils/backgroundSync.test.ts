// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isBackgroundSyncSupported,
  registerBackgroundSync,
  onConnectivityRestored,
} from './backgroundSync';

describe('backgroundSync utility', () => {
  const originalSyncManager = (window as unknown as { SyncManager?: unknown }).SyncManager;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (window as unknown as { SyncManager?: unknown }).SyncManager = originalSyncManager;
  });

  it('يعيد false إذا كان SyncManager غير مدعوم في المتصفح', () => {
    delete (window as unknown as { SyncManager?: unknown }).SyncManager;
    expect(isBackgroundSyncSupported()).toBe(false);
  });

  it('يعيد true إذا كان المتصفح يدعم SyncManager و ServiceWorker', () => {
    (window as unknown as { SyncManager?: unknown }).SyncManager = class {};
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    expect(isBackgroundSyncSupported()).toBe(true);
  });

  it('يعيد false عند استدعاء registerBackgroundSync في بيئة لا تدعم الميزة', async () => {
    delete (window as unknown as { SyncManager?: unknown }).SyncManager;
    const result = await registerBackgroundSync('sync-library');
    expect(result).toBe(false);
  });

  it('يسجل حدث المزامنة بنجاح عند توفر دعم Service Worker و SyncManager', async () => {
    const registerMock = vi.fn(async () => {});
    (window as unknown as { SyncManager?: unknown }).SyncManager = class {};

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          sync: {
            register: registerMock,
          },
        }),
      },
      configurable: true,
    });

    const result = await registerBackgroundSync('custom-sync-tag');
    expect(result).toBe(true);
    expect(registerMock).toHaveBeenCalledWith('custom-sync-tag');
  });

  it('يتعامل بلباقة ويعيد false في حال رمي خطأ أثناء تسجيل المزامنة', async () => {
    (window as unknown as { SyncManager?: unknown }).SyncManager = class {};

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.reject(new Error('Permission denied')),
      },
      configurable: true,
    });

    const result = await registerBackgroundSync('sync-library');
    expect(result).toBe(false);
  });

  it('يستمع لحدث online وينفذ الـ callback عند عودة الاتصال ثم يلغي الاستماع', () => {
    const callback = vi.fn();
    const unsubscribe = onConnectivityRestored(callback);

    window.dispatchEvent(new Event('online'));
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    window.dispatchEvent(new Event('online'));
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
