/**
 * Safe Google Analytics 4 (GA4) wrapper for Yassir platform.
 * Safely handles environments where GA4 is blocked, offline, or disabled.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export interface AnalyticsEventParams {
  [key: string]: string | number | boolean | undefined;
}

const DEFAULT_GA_ID = 'G-EWWZ6T0K7P';

function getMeasurementId(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GA_MEASUREMENT_ID) {
      return String(import.meta.env.VITE_GA_MEASUREMENT_ID).trim();
    }
  } catch {
    // Ignore environment lookup failures
  }
  return DEFAULT_GA_ID;
}

let isInitialized = false;

/**
 * Initializes GA4 script dynamically if not already loaded,
 * with send_page_view disabled by default for SPA manual control.
 */
export function initGA(customId?: string): boolean {
  if (typeof window === 'undefined') return false;
  if (isInitialized) return true;

  const measurementId = customId || getMeasurementId();
  if (!measurementId) return false;

  try {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
      };
    }

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: false, // We control SPA page views manually via useHashRoute
      anonymize_ip: true,
    });

    const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = scriptUrl;
      document.head.appendChild(script);
    }

    isInitialized = true;
    return true;
  } catch (err) {
    console.warn('Analytics initialization failed safely:', err);
    return false;
  }
}

/**
 * تهيئة التحليلات عند أول تفاعل فعلي للمستخدم (لمس، نقر، تمرير، أو ضغط مفتاح)
 * لحماية خصوصية وبيانات المستخدم، وتسريع تحميل الصفحة الأولى (LCP/TBT).
 */
export function setupDeferredGA(): void {
  if (typeof window === 'undefined') return;

  const events = ['click', 'touchstart', 'scroll', 'keydown'] as const;
  const trigger = () => {
    events.forEach((evt) => window.removeEventListener(evt, trigger));
    initGA();
  };

  events.forEach((evt) => window.addEventListener(evt, trigger, { passive: true, once: true }));
}

/**
 * Tracks a manual SPA page view with safe error suppression.
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (!isInitialized) {
      initGA();
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: pageTitle || document.title,
        page_location: window.location.href,
      });
    }
  } catch {
    // Fail silently without disrupting user experience
  }
}

/**
 * Tracks a custom event (e.g. lesson_complete, share_quote, bookmark_add).
 */
export function trackEvent(eventName: string, params?: AnalyticsEventParams): void {
  if (typeof window === 'undefined') return;

  try {
    if (!isInitialized) {
      initGA();
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  } catch {
    // Fail silently
  }
}

/**
 * Helper to reset initialization state in tests.
 */
export function _resetAnalyticsForTesting(): void {
  isInitialized = false;
}
