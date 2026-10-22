import { describe, it, expect } from 'vitest';
import { resolveContentSource, isEmptyContent, describeContentSource } from './contentSource';

describe('resolveContentSource', () => {
  it('لقطة السحابة تتفوق على أي شيء', () => {
    expect(resolveContentSource({ cloudLoaded: true, cachedCount: 84 })).toBe('cloud');
    expect(resolveContentSource({ cloudLoaded: true, cachedCount: 0 })).toBe('cloud');
  });

  it('بلا سحابة: الكاش المحلي إن وُجد', () => {
    expect(resolveContentSource({ cloudLoaded: false, cachedCount: 84 })).toBe('cache');
    expect(resolveContentSource({ cloudLoaded: false, cachedCount: 1 })).toBe('cache');
  });

  it('بلا سحابة وبلا كاش = فارغ (حالة صريحة لا عرض صامت)', () => {
    expect(resolveContentSource({ cloudLoaded: false, cachedCount: 0 })).toBe('empty');
    expect(isEmptyContent('empty')).toBe(true);
    expect(isEmptyContent('cache')).toBe(false);
    expect(isEmptyContent('cloud')).toBe(false);
  });

  it('لا يوجد مصدر اسمه bundle — اللقطة المضمّنة ليست مصدر عرض', () => {
    const sources = ['cloud', 'cache', 'empty'] as const;
    sources.forEach((s) => expect(describeContentSource(s)).toBeTruthy());
  });
});
