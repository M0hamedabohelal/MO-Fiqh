// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initGA, trackPageView, trackEvent, setupDeferredGA, _getQueuedEventsCount, _resetAnalyticsForTesting } from './analytics';

describe('analytics utility', () => {
  beforeEach(() => {
    _resetAnalyticsForTesting();
    document.head.innerHTML = '';
    delete window.gtag;
    delete window.dataLayer;
  });

  afterEach(() => {
    _resetAnalyticsForTesting();
    document.head.innerHTML = '';
    delete window.gtag;
    delete window.dataLayer;
  });

  it('initializes GA4 and adds script tag to head', () => {
    const success = initGA('G-TEST12345');
    expect(success).toBe(true);

    const script = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
    expect(script).toBeTruthy();
    expect(script?.getAttribute('src')).toContain('G-TEST12345');
    expect(window.dataLayer).toBeDefined();
    expect(typeof window.gtag).toBe('function');
  });

  it('avoids adding duplicate script tags when called repeatedly', () => {
    initGA('G-TEST12345');
    initGA('G-TEST12345');

    const scripts = document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]');
    expect(scripts.length).toBe(1);
  });

  it('tracks manual SPA page views accurately', () => {
    initGA('G-TEST12345');
    const gtagSpy = vi.fn();
    window.gtag = gtagSpy;

    trackPageView('/lessons/5/', 'مسألة الطهارة');

    expect(gtagSpy).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/lessons/5/',
      page_title: 'مسألة الطهارة',
      page_location: expect.any(String),
    });
  });

  it('tracks custom events safely', () => {
    initGA('G-TEST12345');
    const gtagSpy = vi.fn();
    window.gtag = gtagSpy;

    trackEvent('lesson_finish', { lesson_id: 12, book: 'كتاب الصلاة' });

    expect(gtagSpy).toHaveBeenCalledWith('event', 'lesson_finish', {
      lesson_id: 12,
      book: 'كتاب الصلاة',
    });
  });

  it('handles exceptions without throwing or breaking application flow', () => {
    window.gtag = () => {
      throw new Error('Blocked by adblocker');
    };

    expect(() => {
      trackPageView('/test');
      trackEvent('test_event');
    }).not.toThrow();
  });

  it('setupDeferredGA waits for user interaction before injecting GA script', () => {
    setupDeferredGA();

    // No script should exist before interaction
    expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();

    // Trigger user click
    window.dispatchEvent(new MouseEvent('click'));

    // Script should now be injected
    expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeTruthy();
  });

  it('بوابة GA: تجميع الأحداث في طابور انتظار قبل تفاعل المستخدم وتفريغها بعد التفاعل', () => {
    // 1. قبل تفاعل المستخدم: البوابة مغلقة
    trackPageView('/lessons/1/', 'المسألة الأولى');
    trackEvent('lesson_open', { lesson_id: 1 });

    // لا يوجد أي سكربت تم حقنه
    expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();
    // الطابور يحمل الحدثين
    expect(_getQueuedEventsCount()).toBe(2);

    // 2. تفاعل المستخدم (استدعاء initGA)
    initGA('G-TEST12345');

    // تم حقن السكربت
    expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeTruthy();
    // تم تفريغ طابور الانتظار بنجاح
    expect(_getQueuedEventsCount()).toBe(0);
  });
});
