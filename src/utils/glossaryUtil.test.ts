import { describe, it, expect } from 'vitest';
import { normalizeGlossaryTerm, normalizeWithIndex, sortedGlossaryTerms } from './glossaryUtil';

describe('normalizeGlossaryTerm', () => {
  it('يزيل التشكيل والتطويل', () => {
    expect(normalizeGlossaryTerm('الطَّهَـارَة')).toBe('الطهاره');
  });

  it('يوحّد أشكال الألف', () => {
    expect(normalizeGlossaryTerm('إداوة')).toBe('اداوه');
    expect(normalizeGlossaryTerm('آنية')).toBe('انيه');
  });

  it('يحوّل الألف المقصورة إلى ياء', () => {
    expect(normalizeGlossaryTerm('البراز')).toBe('البراز');
    expect(normalizeGlossaryTerm('الملاعن')).toBe('الملاعن');
  });

  it('يعيد سلسلة فارغة للمدخل الفارغ', () => {
    expect(normalizeGlossaryTerm('')).toBe('');
  });
});

describe('normalizeWithIndex', () => {
  it('طول الخريطة يساوي طول النص المطبّع', () => {
    const { norm, map } = normalizeWithIndex('الطَّهارة واجبة');
    expect(map.length).toBe(norm.length);
  });

  it('الخريطة تشير لمواضع النص الأصلي', () => {
    const text = 'قال: الطهارة';
    const { norm, map } = normalizeWithIndex(text);
    const idx = norm.indexOf('الطهاره');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(text.slice(map[idx], map[idx] + 'الطهارة'.length)).toBe('الطهارة');
  });
});

describe('sortedGlossaryTerms', () => {
  it('يرتّب من الأطول للأقصر ليفضّل أطول تطابق', () => {
    const entries = sortedGlossaryTerms({ 'الماء': 'تعريف', 'الماء الطهور': 'تعريف', 'ماء': 'تعريف' });
    expect(entries[0].term).toBe('الماء الطهور');
    expect(entries[entries.length - 1].term).toBe('ماء');
  });

  it('يستبعد المفتاح الفارغ تمامًا', () => {
    expect(sortedGlossaryTerms({ '': 'فارغ' })).toHaveLength(0);
  });

  it('يقبل القاموس غير المعرف', () => {
    expect(sortedGlossaryTerms(undefined)).toEqual([]);
  });
});
