// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ExplanationCard from './ExplanationCard';
import * as haptics from '../../utils/haptics';

vi.mock('../../utils/clipboard', () => ({
  copyText: vi.fn().mockResolvedValue(true),
}));

describe('ExplanationCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض الشرح القصير كاملاً دون ظهور زر الطي والتوسيع', () => {
    render(<ExplanationCard explanation="هذا شرح فقهي موجز جداً." searchQuery="" />);

    expect(screen.getByText('شرح وتعليق الشيخ')).toBeTruthy();
    expect(screen.getByText(/هذا شرح فقهي موجز/)).toBeTruthy();
    expect(screen.queryByText(/عرض الشرح كاملاً/)).toBeNull();
  });

  it('يطوي الشرح الطويل افتراضياً ويُظهر زر عرض الشرح كاملاً مع تقدير وقت القراءة', () => {
    const longExplanation =
      'هذا شرح طويل ومفصل يتناول المسائل الفقهية بعمق وبحث مستفيض في الأدلة الشرعية. ' +
      'يتفرع عنه العديد من الفروع المتعلقة بشروط الصلاة وأركانها وسننها القبلية والبعدية. ' +
      'وقد استدل العلماء بأحاديث صحيحة في الصحيحين، منها ما روت عائشة رضي الله عنها، ' +
      'وما رواه عبد الله بن عمر رضي الله عنهما في عدد الركعات وأوقاتها، ' +
      'وهذا الشرح يتطلب وقتاً كافياً للقراءة والاستيعاب والتأمل في أحكام الشريعة الإسلامية السمحة.';

    render(<ExplanationCard explanation={longExplanation} searchQuery="" />);

    const expandBtn = screen.getByRole('button', { name: /عرض الشرح كاملاً/i });
    expect(expandBtn).toBeTruthy();
    expect(expandBtn.getAttribute('aria-expanded')).toBe('false');

    const hapticSpy = vi.spyOn(haptics, 'triggerHaptic');
    fireEvent.click(expandBtn);

    expect(hapticSpy).toHaveBeenCalledWith('selection');
    expect(screen.getByRole('button', { name: /طي شرح الشيخ/i })).toBeTruthy();
  });

  it('يفتح الشرح الطويل تلقائياً إذا كان هناك استعلام بحث يطابق جزءاً من الشرح', () => {
    const longExplanation =
      'هذا شرح طويل يحتوي على كلمة مفتاحية خاصة مثل المضمضة والاستنشاق في مسائل الطهارة. ' +
      'ويتكرر هذا الحكم في عدة كتب فقهية قديمة وحديثة مما يجعله طويلاً جداً ومستفيضاً.'.repeat(4);

    render(<ExplanationCard explanation={longExplanation} searchQuery="المضمضة" />);

    // يجب أن يكون مفتوحاً تلقائياً
    const collapseBtn = screen.getByRole('button', { name: /طي شرح الشيخ/i });
    expect(collapseBtn).toBeTruthy();
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('true');
  });
});
