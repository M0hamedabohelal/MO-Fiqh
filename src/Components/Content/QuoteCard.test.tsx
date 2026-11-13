// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import QuoteCard from './QuoteCard';
import * as clipboard from '../../utils/clipboard';
import * as haptics from '../../utils/haptics';

describe('QuoteCard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض نص المسألة بشكل سليم مع زر النسخ', () => {
    render(
      <QuoteCard
        text="الماء طهور لا ينجسه شيء إلا ما غلب على ريحه أو طعمه أو لونه"
        searchQuery=""
      />
    );

    expect(screen.getByText('طهور')).toBeTruthy();
    expect(screen.getByText(/لا ينجسه شيء/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /نسخ نص المسألة/i })).toBeTruthy();
  });

  it('الضغط على زر النسخ يستدعي copyText ويُظهر أيقونة النجاح', async () => {
    vi.useFakeTimers();
    const copySpy = vi.spyOn(clipboard, 'copyText').mockResolvedValue(true);

    render(
      <QuoteCard
        text="نص تجريبي للنسخ"
        searchQuery=""
      />
    );

    const copyBtn = screen.getByRole('button', { name: /نسخ نص المسألة/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(copySpy).toHaveBeenCalledWith('نص تجريبي للنسخ');
    const checkIcon = copyBtn.querySelector('svg');
    expect(checkIcon).toBeTruthy();
    expect(checkIcon?.getAttribute('stroke')).toBe('currentColor');

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    vi.useRealTimers();
  });

  it('يُحلل الروابط التشعبية للمسائل الأخرى [نص](lesson:ID) ويحوّلها لرابط تنقل', () => {
    render(
      <QuoteCard
        text="حكم المسألة: كما تقدّم بيانه في [شروط الصلاة](lesson:15) بالتفصيل."
        searchQuery=""
        glossary={{}}
      />
    );

    const link = screen.getByRole('link', { name: /شروط الصلاة/i }) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('#/lesson/15');
  });

  it('يُبرز مصطلحات القاموس كأزرار قابلة للضغط', () => {
    const customGlossary = {
      'الطهور': 'الماء الباقي على خلقته الأصلية المطلقة',
    };

    render(
      <QuoteCard
        text="الماء الطهور طاهر في نفسه مطهر لغيره"
        searchQuery=""
        glossary={customGlossary}
      />
    );

    const term = screen.getByRole('button', { name: /تعريف مصطلح: الطهور/i });
    expect(term).toBeTruthy();
  });

  it('يعرض المتن القصير كاملاً دون ظهور زر الطي والتوسيع', () => {
    render(<QuoteCard text="هذا متن فقهي موجز جداً." searchQuery="" />);

    expect(screen.getByText('متن المسألة')).toBeTruthy();
    expect(screen.getByText(/هذا متن فقهي موجز/)).toBeTruthy();
    expect(screen.queryByText(/عرض المتن كاملاً/)).toBeNull();
  });

  it('يطوي المتن الطويل افتراضياً ويُظهر زر عرض المتن كاملاً مع تقدير وقت القراءة', () => {
    const longText =
      'هذا متن طويل ومفصل يتناول المسائل الفقهية بعمق وبحث مستفيض في الأحكام الشرعية. ' +
      'يتفرع عنه العديد من الفروع المتعلقة بشروط الصلاة وأركانها وسننها القبلية والبعدية. ' +
      'وقد بين الفقهاء شروط صحة الوضوء وفروضه وسننه وآدابه ومكروهاته ونواقضه بالتفصيل، ' +
      'وما يجب على المسلم معرفته في أداء العبادات على الوجه الصحيح الموافق لسنة النبي ﷺ، ' +
      'وهذا المتن يتطلب وقتاً كافياً للقراءة والاستيعاب والتأمل في أحكام الفقه الإسلامي.';

    render(<QuoteCard text={longText} searchQuery="" />);

    const expandBtn = screen.getByRole('button', { name: /عرض المتن كاملاً/i });
    expect(expandBtn).toBeTruthy();
    expect(expandBtn.getAttribute('aria-expanded')).toBe('false');

    const hapticSpy = vi.spyOn(haptics, 'triggerHaptic');
    fireEvent.click(expandBtn);

    expect(hapticSpy).toHaveBeenCalledWith('selection');
    expect(screen.getByRole('button', { name: /طي متن المسألة/i })).toBeTruthy();
  });

  it('يفتح المتن الطويل تلقائياً إذا كان هناك استعلام بحث يطابق جزءاً من المتن', () => {
    const longText =
      'هذا متن طويل يحتوي على كلمة مفتاحية خاصة مثل الاستنشاق في مسائل الطهارة. ' +
      'ويتكرر هذا الحكم في عدة كتب فقهية قديمة وحديثة مما يجعله طويلاً جداً ومستفيضاً.'.repeat(4);

    render(<QuoteCard text={longText} searchQuery="الاستنشاق" />);

    // يجب أن يكون مفتوحاً تلقائياً
    const collapseBtn = screen.getByRole('button', { name: /طي متن المسألة/i });
    expect(collapseBtn).toBeTruthy();
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('true');
  });
});
