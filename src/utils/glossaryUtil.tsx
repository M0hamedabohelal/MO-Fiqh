import { Fragment } from 'react';
import type { ReactNode, MouseEvent } from 'react';
import type { GlossaryMap } from '../types';

// أدوات مطابقة مصطلحات القاموس في النصوص (بتطبيع متسامح مع التشكيل/أشكال الحروف)
// تُستخدم في متن المسألة (QuoteCard) وشرح الشيخ (ExplanationCard)

// تطبيع حرفي عربي للتسامح مع التشكيل واختلاف أشكال الحروف (للمطابقة فقط)
export function normalizeGlossaryTerm(s: string): string {
  return String(s || '')
    .normalize('NFKC')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // تشكيل + تطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

// تطبيع مع حفظ خريطة موضع (NormIndex → OrigIndex) كي نُبرز النص الأصلي
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

export interface GlossaryEntry {
  term: string;
  def: string;
  norm: string;
}

// بناء قائمة مصطلحات مُطبَّعة ومرتّبة من الأطول للأقصر (تفضيل أطول تطابق)
export function sortedGlossaryTerms(glossary: GlossaryMap | undefined): GlossaryEntry[] {
  return Object.entries(glossary || {})
    .map(([term, def]) => ({ term, def, norm: normalizeGlossaryTerm(term) }))
    .filter((e) => e.norm)
    .sort((a, b) => b.norm.length - a.norm.length);
}

type ParseLinksFn = (text: string, key: string) => ReactNode;

export interface GlossaryHandlers {
  onHover: (e: MouseEvent, term: string) => void;
  onClick: (e: MouseEvent, term: string) => void;
  onLeave: () => void;
  onMove?: (e: MouseEvent) => void;
}

// مُولّد دالة عرض النص مع إبراز المصطلحات كـ <span class="glossary-term">
// يجب تمرير كولباكس الأحداث (hover/click/leave) التي تدير نافذة التعريف.
export function createGlossaryRenderer(
  sortedTerms: GlossaryEntry[],
  { onHover, onClick, onLeave, onMove }: GlossaryHandlers,
) {
  return function renderGlossary(plainText: string, baseKey: string, parseLinks?: ParseLinksFn): ReactNode[] {
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
      let best = null;
      for (const e of sortedTerms) {
        if (norm.startsWith(e.norm, cur) && (!best || e.norm.length > best.norm.length)) {
          best = e;
        }
      }
      if (best) {
        const before = plainText.slice(lastOrig, map[cur]);
        if (before) {
          nodes.push(parseLinks ? parseLinks(before, `${baseKey}-t${k}`) : before);
        }
        const end = cur + best.norm.length;
        const origStart = map[cur];
        const origEnd = map[end - 1] + 1;
        nodes.push(
          <span
            key={`${baseKey}-g-${k}`}
            className="glossary-term"
            onMouseEnter={(e) => onHover(e, best.term)}
            onClick={(e) => onClick(e, best.term)}
            onMouseMove={onMove ? (e) => onMove(e) : undefined}
            onMouseLeave={onLeave}
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
