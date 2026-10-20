import { describe, it, expect } from 'vitest';
import { nextProgress, hideDelay, SPLASH_MIN_MS, SPLASH_PROGRESS_CEIL } from './useSplash';

describe('nextProgress', () => {
  it('يتقدّم للأمام من قيمة ابتدائية', () => {
    expect(nextProgress(7)).toBeGreaterThan(7);
  });

  it('لا يتجاوز سقف الانتظار 92% أبدًا', () => {
    let p = 7;
    for (let i = 0; i < 500; i += 1) p = nextProgress(p);
    expect(p).toBeLessThanOrEqual(SPLASH_PROGRESS_CEIL);
  });

  it('يثبت عند السقف دون تجاوزه', () => {
    expect(nextProgress(92)).toBe(92);
    expect(nextProgress(95)).toBe(95);
  });

  it('يتقارب بتباطؤ (الخطوة تتناقص مع الاقتراب من السقف)', () => {
    const step1 = nextProgress(10) - 10;
    const step2 = nextProgress(70) - 70;
    expect(step1).toBeGreaterThan(step2);
  });
});

describe('hideDelay', () => {
  it('ينتظر لتسوية الحد الأدنى إن كان الوقت المنقضي أقل', () => {
    expect(hideDelay(0)).toBe(SPLASH_MIN_MS);
    expect(hideDelay(200)).toBe(SPLASH_MIN_MS - 200);
  });

  it('لا ينتظر إن انقضى الحد الأدنى بالفعل', () => {
    expect(hideDelay(SPLASH_MIN_MS)).toBe(0);
    expect(hideDelay(5000)).toBe(0);
  });
});
