import { describe, it, expect, vi } from 'vitest';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import {
  normalizeGlossaryTerm,
  normalizeWithIndex,
  isWordChar,
  atWordBoundary,
  sortedGlossaryTerms,
  countTermMatches,
  createGlossaryRenderer,
} from './glossaryUtil';

interface GlossarySpanProps {
  className?: string;
  children?: string;
  'aria-label'?: string;
}

function getGlossarySpans(nodes: unknown[]): ReactElement<GlossarySpanProps>[] {
  return nodes.filter(
    (n): n is ReactElement<GlossarySpanProps> =>
      isValidElement(n) && (n.props as GlossarySpanProps)?.className === 'glossary-term',
  );
}

describe('normalizeGlossaryTerm', () => {
  it('يزيل التشكيل والتطويل', () => {
    expect(normalizeGlossaryTerm('الطَّهَـارَة')).toBe('الطهاره');
  });

  it('يوحّد أشكال الألف', () => {
    expect(normalizeGlossaryTerm('إداوة')).toBe('اداوه');
    expect(normalizeGlossaryTerm('آنية')).toBe('انيه');
  });

  it('يحوّل الألف المقصورة إلى ياء والتاء المربوطة إلى هاء', () => {
    expect(normalizeGlossaryTerm('البراز')).toBe('البراز');
    expect(normalizeGlossaryTerm('الملاعن')).toBe('الملاعن');
    expect(normalizeGlossaryTerm('يَتَخَلّى')).toBe('يتخلي');
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

  it('الخريطة تشير لمواضع النص الأصلي بدقة', () => {
    const text = 'قال: الطهارة';
    const { norm, map } = normalizeWithIndex(text);
    const idx = norm.indexOf('الطهاره');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(text.slice(map[idx], map[idx] + 'الطهارة'.length)).toBe('الطهارة');
  });
});

describe('isWordChar & atWordBoundary (حدود الكلمات الصارمة)', () => {
  it('يميز الحروف العربية كأحرف كلمة', () => {
    expect(isWordChar('ع')).toBe(true);
    expect(isWordChar('ي')).toBe(true);
    expect(isWordChar('د')).toBe(true);
  });

  it('يميز علامات الترقيم والمسافات كفواصل وحدود صحيحة', () => {
    expect(isWordChar(' ')).toBe(false);
    expect(isWordChar('،')).toBe(false);
    expect(isWordChar('.')).toBe(false);
    expect(isWordChar('(')).toBe(false);
    expect(isWordChar(')')).toBe(false);
    expect(isWordChar('«')).toBe(false);
    expect(isWordChar('»')).toBe(false);
    expect(isWordChar(undefined)).toBe(false);
  });

  it('يرفض التطابق إذا كان الحرف السابق أو اللاحق حرف كلمة عربي', () => {
    const norm = 'صعيدا'; // صعيدا يحتوي على "يد" في الموضع [2..4]
    expect(atWordBoundary(norm, 2, 4)).toBe(false); // قبله "ع"
  });

  it('يقبل التطابق إذا كان محاطًا بمسافات أو ترقيم أو بداية/نهاية النص', () => {
    const norm = 'قال يد الرجل';
    expect(atWordBoundary(norm, 4, 6)).toBe(true);
  });
});

describe('المطابقة الصرفية وحدود الكلمات — متطلبات خطة Glossary-Matching-Fix', () => {
  const dummyHandlers = {
    onHover: vi.fn(),
    onClick: vi.fn(),
    onLeave: vi.fn(),
  };

  it('لا تطابق "يد" داخل «صَعِيدًا» أو «سعيد» أو «الحديد» أو «يدخل»', () => {
    const glossary = { 'يد': 'عضو من أعضاء الوضوء' };
    const sorted = sortedGlossaryTerms(glossary);
    const renderer = createGlossaryRenderer(sorted, dummyHandlers);

    const testText = 'فتيمموا صعيداً طيباً مع سعيد والحديد ويدخل المسجد';
    const nodes = renderer(testText, 'test-1');

    // لا ينبغي إبراز أي مصطلح "يد" داخل هذه الكلمات الأطول
    const termSpans = getGlossarySpans(nodes);
    expect(termSpans).toHaveLength(0);
  });

  it('لا تطابق "ماء" داخل «سماء» ولكن تطابقها مستقلة في «ماء الورد»', () => {
    const glossary = { 'ماء': 'سائل طاهر', 'ماء الورد': 'ماء مضاف' };
    const sorted = sortedGlossaryTerms(glossary);
    const renderer = createGlossaryRenderer(sorted, dummyHandlers);

    // في كلمة سماء، قبله "س" فلا يطابق
    const resSama = renderer('أنزل من سماء ماءً', 'test-2');
    const matchedSama = getGlossarySpans(resSama);
    // يطابق فقط "ماءً" المستقلة، ولا يطابق داخل "سماء"
    expect(matchedSama).toHaveLength(1);
    expect(matchedSama[0].props.children).toBe('ماءً');

    // في "ماء الورد" يفضّل المصطلح الأطول "ماء الورد"
    const resWard = renderer('استعمل ماء الورد في الغسل', 'test-3');
    const matchedWard = getGlossarySpans(resWard);
    expect(matchedWard).toHaveLength(1);
    expect(matchedWard[0].props.children).toBe('ماء الورد');
  });

  it('تطابق "الصلاة" مع نص فيه «صلاة» و«وصلاته» و«الصلاة» بمفتاح واحد (تسامح ال والسوابق/الضمائر)', () => {
    const glossary = { 'الصلاة': 'عبادة ذات أقوال وأفعال' };
    const sorted = sortedGlossaryTerms(glossary);
    const renderer = createGlossaryRenderer(sorted, dummyHandlers);

    const text = 'أقام الصلاة وحضرت صلاة الجنازة وكانت وصلاته صحيحة';
    const nodes = renderer(text, 'test-4');
    const termSpans = getGlossarySpans(nodes);

    expect(termSpans.length).toBe(3);
    expect(termSpans.map((s) => s.props.children)).toEqual(['الصلاة', 'صلاة', 'وصلاته']);
    expect(termSpans.every((s) => s.props['aria-label'] === 'تعريف مصطلح: الصلاة')).toBe(true);
  });

  it('تطابق "البراز" مع «البَراز» (تسامح تشكيل) بمفتاح واحد', () => {
    const glossary = { 'البراز': 'المكان الفضاء' };
    const sorted = sortedGlossaryTerms(glossary);
    const renderer = createGlossaryRenderer(sorted, dummyHandlers);

    const text = 'ذهب إلى البَراز لقضاء الحاجة';
    const nodes = renderer(text, 'test-5');
    const termSpans = getGlossarySpans(nodes);

    expect(termSpans).toHaveLength(1);
    expect(termSpans[0].props.children).toBe('البَراز');
  });

  it('المصطلح متعدد الكلمات («مفهوم المخالفة») يُطابق بمسافاته الداخلية', () => {
    const glossary = { 'مفهوم المخالفة': 'دلالة اللفظ على نقيض حكم المنطوق' };
    const sorted = sortedGlossaryTerms(glossary);
    const renderer = createGlossaryRenderer(sorted, dummyHandlers);

    const text = 'يؤخذ هذا الحكم من مفهوم المخالفة في الحديث';
    const nodes = renderer(text, 'test-6');
    const termSpans = getGlossarySpans(nodes);

    expect(termSpans).toHaveLength(1);
    expect(termSpans[0].props.children).toBe('مفهوم المخالفة');
  });

  it('حفاظ المواضع: النص المُبرز يطابق المقطع الأصلي حرفياً مع الحركات والتشكيل الأخير', () => {
    const glossary = { 'الطهارة': 'النظافة والنزاهة' };
    const sorted = sortedGlossaryTerms(glossary);
    const renderer = createGlossaryRenderer(sorted, dummyHandlers);

    const text = 'قال: الطَّهَارَةُ شَرْطٌ.';
    const nodes = renderer(text, 'test-7');
    const termSpans = getGlossarySpans(nodes);

    expect(termSpans).toHaveLength(1);
    expect(termSpans[0].props.children).toBe('الطَّهَارَةُ');
  });
});

describe('countTermMatches (إحصاء المعاينة للوحة الإدارة)', () => {
  it('يحسب عدد مرات التطابق الصحيحة في قائمة النصوص', () => {
    const texts = [
      'المسألة الأولى: في الطهارة وأقسامها',
      'والطهارة شرط لصحة الصلاة',
      'طهارة الثوب والبدن واجبة',
    ];
    expect(countTermMatches('الطهارة', texts)).toBe(3);
    expect(countTermMatches('الصلاة', texts)).toBe(1);
    expect(countTermMatches('غير موجود', texts)).toBe(0);
  });
});
