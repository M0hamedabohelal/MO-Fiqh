import { Fragment } from 'react';
import type { ReactNode, MouseEvent } from 'react';
import type { GlossaryMap } from '../types';

// أدوات مطابقة مصطلحات القاموس في النصوص (حدود الكلمات · التسامح الصرفي · توحيد المنطق)
// تُستخدم في متن المسألة (QuoteCard) وشرح الشيخ (ExplanationCard) ولوحة الإدارة

// تطبيع حرفي عربي للتسامح مع التشكيل واختلاف أشكال الحروف (للمطابقة فقط)
export function normalizeGlossaryTerm(s: string): string {
  return String(s || '')
    .normalize('NFKC')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // تشكيل + تطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

// تطبيع مع حفظ خريطة موضع (NormIndex → OrigIndex) كي نُبرز النص الأصلي بدقة
export function normalizeWithIndex(s: string): { norm: string; map: number[] } {
  const map: number[] = [];
  let norm = '';
  for (let i = 0; i < s.length; i += 1) {
    let c = s[i].normalize('NFKC');
    c = c.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
    if (!c) continue; // حروف التشكيل المحذوفة لا تستهلك موضعًا في الناتج
    c = c.replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    map.push(i);
    norm += c;
  }
  return { norm, map };
}

// فحص الحرف العربي والكلمي (لتحديد حدود الكلمات بدقة)
export function isWordChar(c?: string): boolean {
  if (!c) return false;
  // حروف اللغة العربية (من همزة إلى ياء والألفات الممدودة والمقصورة) بالإضافة للأرقام واللاتيني
  return /[\u0621-\u064A\u0671-\u06D3\u06EE-\u06EF\u06FA-\u06FCa-zA-Z0-9]/.test(c);
}

// التحقق من حدود الكلمة: الحرف السابق واللاحق ليسا حرفًا عربيًا أو حرف كلمة
export function atWordBoundary(norm: string, start: number, end: number): boolean {
  const beforeOk = start === 0 || !isWordChar(norm[start - 1]);
  const afterOk = end >= norm.length || !isWordChar(norm[end]);
  return beforeOk && afterOk;
}

export interface GlossaryEntry {
  term: string;
  def: string;
  norm: string;
}

// توليد الصيغ المشتقة من المصطلح الواحد للتسامح مع "ال" التعريف والسوابق واللواحق الشائعة
function generateTermVariants(term: string, def: string): GlossaryEntry[] {
  const canonicalNorm = normalizeGlossaryTerm(term);
  if (!canonicalNorm) return [];

  const variants = new Map<string, GlossaryEntry>();
  const add = (n: string) => {
    if (n && !variants.has(n)) {
      variants.set(n, { term, def, norm: n });
    }
  };

  // 1. الصيغة المطبّعة الأساسية
  add(canonicalNorm);

  // إذا كان المصطلح متعدد الكلمات (مثل "مفهوم المخالفة" أو "بئر بضاعة")، يطابق كعبارة كاملة بمسافاتها الداخلية
  if (canonicalNorm.includes(' ')) {
    return Array.from(variants.values());
  }

  // 2. التسامح الصرفي للكلمات المفردة:
  // استخراج الجذر المجرّد من "ال" إن وجدت
  let bare = canonicalNorm;
  if (canonicalNorm.startsWith('ال') && canonicalNorm.length > 3) {
    bare = canonicalNorm.slice(2);
  }

  // الصيغة المعرفة بـ "ال"
  const withAl = canonicalNorm.startsWith('ال') ? canonicalNorm : `ال${canonicalNorm}`;

  add(bare);
  add(withAl);

  // سوابق العطف والجر الشائعة في كتب الفقه (و، ف، ب، ل، ك)
  const prefixes = ['و', 'ف', 'ب', 'ل', 'ك'];
  for (const p of prefixes) {
    add(`${p}${bare}`);
    add(`${p}${withAl}`);
  }

  // لام الجر عند دخولها على "ال" التعريف (مثل "للصلاة"، "للطهور")
  if (withAl.startsWith('ال')) {
    const lamAl = `لل${withAl.slice(2)}`;
    add(lamAl);
    add(`و${lamAl}`);
    add(`ف${lamAl}`);
  }

  // الضمائر المتصلة الشائعة (مثل "صلاته"، "وضوءه"، "خفه"، "صلاتهم")
  // إذا كانت الكلمة تنتهي بتاء مربوطة (تحولت في التطبيع إلى هاء)، فإنها تصبح تاء مع الضمير (صلاة -> صلاته)
  const stem = bare.endsWith('ه') ? `${bare.slice(0, -1)}ت` : bare;
  const suffixes = ['ه', 'ها', 'هم', 'ك', 'ي', 'نا'];
  for (const s of suffixes) {
    const suffixed = `${stem}${s}`;
    add(suffixed);
    add(`و${suffixed}`);
    add(`ف${suffixed}`);
    add(`ب${suffixed}`);
    add(`ل${suffixed}`);
  }

  return Array.from(variants.values());
}

// بناء قائمة مصطلحات مُطبَّعة ومرتّبة من الأطول للأقصر (تفضيل أطول تطابق)
export function sortedGlossaryTerms(glossary: GlossaryMap | undefined): GlossaryEntry[] {
  if (!glossary) return [];

  const allEntries: GlossaryEntry[] = [];
  const seenNorms = new Set<string>();

  for (const [term, def] of Object.entries(glossary)) {
    const termVariants = generateTermVariants(term, def);
    for (const v of termVariants) {
      if (!seenNorms.has(v.norm)) {
        seenNorms.add(v.norm);
        allEntries.push(v);
      }
    }
  }

  // الترتيب من الأطول للأقصر لضمان تطابق الأطول أولاً (مثل "الماء الطهور" قبل "الماء")
  return allEntries.sort((a, b) => b.norm.length - a.norm.length);
}

// كاش للصيغ المشتقة لكل مصطلح لتجنب تكرار توليد الصيغ وفرزها في كل فحص
const termVariantsCache = new Map<string, GlossaryEntry[]>();

export function getTermVariants(term: string): GlossaryEntry[] {
  let cached = termVariantsCache.get(term);
  if (!cached) {
    cached = sortedGlossaryTerms({ [term]: 'def' });
    termVariantsCache.set(term, cached);
  }
  return cached;
}

// إحصاء عدد مرات تطابق مصطلح معين في نصوص معينة (للوحة الإدارة والمعاينة)
// يدعم التمرير المسبق لنصوص مطبّعة لتسريع المعالجة الفائقة عبر indexOf وحدود الكلمات
export function countTermMatches(term: string, texts: string[], preNormalized = false): number {
  const normTerm = normalizeGlossaryTerm(term);
  if (!normTerm || !texts || texts.length === 0) return 0;
  const entries = getTermVariants(term);
  if (entries.length === 0) return 0;

  // تسريع فائق: تحديد أصغر نص فرعي مشترك للمصطلح ومشتقاته لتجاوز النصوص غير ذات الصلة فورًا
  let checkSubstr = normTerm;
  if (!normTerm.includes(' ')) {
    let bare = normTerm;
    if (bare.startsWith('ال') && bare.length > 3) {
      bare = bare.slice(2);
    }
    checkSubstr = bare.endsWith('ه') ? bare.slice(0, -1) : bare;
  }

  let count = 0;
  for (const rawText of texts) {
    if (!rawText) continue;
    const norm = preNormalized ? rawText : normalizeGlossaryTerm(rawText);
    if (checkSubstr && norm.indexOf(checkSubstr) === -1) continue;

    const intervals: Array<[number, number]> = [];
    for (const e of entries) {
      let idx = norm.indexOf(e.norm);
      while (idx !== -1) {
        const end = idx + e.norm.length;
        if (atWordBoundary(norm, idx, end)) {
          intervals.push([idx, end]);
        }
        idx = norm.indexOf(e.norm, idx + 1);
      }
    }
    if (intervals.length === 0) continue;
    intervals.sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : (b[1] - b[0]) - (a[1] - a[0])));
    let lastEnd = -1;
    for (const [s, e] of intervals) {
      if (s >= lastEnd) {
        count += 1;
        lastEnd = e;
      }
    }
  }
  return count;
}

type ParseLinksFn = (text: string, key: string) => ReactNode;

interface GlossaryHandlers {
  onHover: (e: MouseEvent, term: string) => void;
  onClick: (e: MouseEvent, term: string) => void;
  onLeave: () => void;
  onMove?: (e: MouseEvent) => void;
}

// مُولّد دالة عرض النص مع إبراز المصطلحات كـ <span class="glossary-term">
// المصدر الواحد المشترك لمتن المسألة وشرح الشيخ
export function createGlossaryRenderer(
  sortedTerms: GlossaryEntry[],
  { onHover, onClick, onLeave, onMove }: GlossaryHandlers,
) {
  return function renderGlossary(plainText: string, baseKey: string | number, parseLinks?: ParseLinksFn): ReactNode[] {
    if (sortedTerms.length === 0) {
      return [
        <Fragment key={`${baseKey}-e`}>
          {parseLinks ? parseLinks(plainText, `${baseKey}-p`) : plainText}
        </Fragment>,
      ];
    }
    const { norm, map } = normalizeWithIndex(plainText);
    const nodes: ReactNode[] = [];
    let cur = 0;
    let lastOrig = 0;
    let k = 0;
    while (cur < norm.length) {
      let best: GlossaryEntry | null = null;
      for (const e of sortedTerms) {
        if (norm.startsWith(e.norm, cur)) {
          const end = cur + e.norm.length;
          if (atWordBoundary(norm, cur, end)) {
            best = e;
            break; // sortedTerms مرتبة من الأطول للأقصر
          }
        }
      }
      if (best) {
        const before = plainText.slice(lastOrig, map[cur]);
        if (before) {
          nodes.push(parseLinks ? parseLinks(before, `${baseKey}-t${k}`) : before);
        }
        const end = cur + best.norm.length;
        const origStart = map[cur];
        let origEnd = map[end - 1] + 1;
        // استيعاب أي علامات تشكيل تابعة لآخر حرف من الكلمة في النص الأصلي (منع الحركات العائمة)
        while (origEnd < plainText.length && /[\u064B-\u0652\u0670\u0640]/.test(plainText[origEnd])) {
          origEnd += 1;
        }
        nodes.push(
          <span
            key={`${baseKey}-g-${k}`}
            className="glossary-term"
            role="button"
            tabIndex={0}
            aria-label={`تعريف مصطلح: ${best.term}`}
            onMouseEnter={(e) => onHover(e, best.term)}
            onClick={(e) => onClick(e, best.term)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // لوحة المفاتيح بلا إحداثيات مؤشر — نمركز نافذة التعريف تحت المصطلح نفسه
                const rect = (e.currentTarget as unknown as HTMLElement).getBoundingClientRect();
                onClick({ clientX: rect.left + rect.width / 2, clientY: rect.bottom + 8 } as unknown as MouseEvent, best.term);
              }
            }}
            onMouseMove={onMove ? (e) => onMove(e) : undefined}
            onMouseLeave={onLeave}
            onBlur={onLeave}
          >
            {plainText.slice(origStart, origEnd)}
          </span>,
        );
        lastOrig = origEnd;
        cur = end;
        k += 1;
      } else {
        cur += 1;
      }
    }
    const rest = plainText.slice(lastOrig);
    if (rest) nodes.push(parseLinks ? parseLinks(rest, `${baseKey}-t${k}`) : rest);
    return nodes;
  };
}
