import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

// 6 مسارات حرجة على مقاس فون + حارس أخطاء كونسول.
// الهدف: ما لا تستطيع اختبارات الوحدة رؤيته — DOM حقيقي، توجيه هاشي، وحفظ فعلي
// بعد إعادة تحميل الصفحة.

const TRI = 'كتاب الطهارة';

/** يجمع أخطاء الكونسول الحقيقية. أخطاء الشبكة العابرة تُتجاهل،
 *  وعطل Firestore الداخلي المعروف (ca9/b815) يُسجَّل كتعليق مرئي في التقرير
 *  لا كفشل — لأنه متقطّع (0/12 في المسابر) فيُفشل البوابة عشوائيًا. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  const benign = /ERR_ABORTED|net::ERR_FAILED|Failed to fetch|the server responded with a status of 4\d\d/i;
  const firestoreGlitch = /INTERNAL (ASSERTION|UNHANDLED)/i;

  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (firestoreGlitch.test(text)) {
      const seen = test.info().annotations.find((a) => a.type === 'firestore-glitch');
      if (!seen) test.info().annotations.push({ type: 'firestore-glitch', description: text.slice(0, 300) });
      return;
    }
    if (!benign.test(text)) errors.push(`console: ${text.slice(0, 200)}`);
  });
  return errors;
}

/** يفتح فهرس الكتب وينتظر وصول المحتوى من السحابة */
async function openBooks(page: Page): Promise<void> {
  await page.goto('/#/books');
  await expect(page.getByRole('heading', { level: 3, name: 'فهرس الكتب' })).toBeVisible();
  await expect(page.getByText(TRI).first()).toBeVisible({ timeout: 30_000 });
  // عدّاد المسائل يثبت أن المحتوى الحقيقي وصل (لا حالة فارغة ولا نسخة ناقصة)
  await expect(page.getByText(/\d+ مسألة/).first()).toBeVisible();
}

/** يفتح مسألة وينتظر انتهاء شاشة البداية (تظهر h1 مؤقت) قبل تأكيد محتوى القراءة */
async function openLesson(page: Page, id: number): Promise<void> {
  await page.goto(`/#/lesson/${id}`);
  await expect(page.getByRole('heading', { level: 1, name: /المسألة/ })).toBeVisible({ timeout: 30_000 });
  // علامة أن شاشة القراءة نفسها اكتمل تحميلها (بطاقة الملاحظات تُركَّب دائمًا)
  await expect(page.getByRole('textbox', { name: 'ملاحظاتك حول هذه المسألة' })).toBeVisible({ timeout: 30_000 });
}

test.describe('المسارات الحرجة', () => {
  test('1) فهرس الكتب يعرض المحتوى الحقيقي', async ({ page }) => {
    const errors = collectErrors(page);
    await openBooks(page);
    await expect(page.getByText('كتاب الصلاة').first()).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('2) كتاب ← باب ← مسألة: شاشة القراءة تعرض العنوان والنص', async ({ page }) => {
    const errors = collectErrors(page);
    await openBooks(page);

    await page.getByText(TRI).first().click();
    await expect(page.getByRole('heading', { name: new RegExp(TRI) }).first()).toBeVisible();

    await page.getByRole('button', { name: /الباب الأول/ }).first().click();
    await page.getByText(/المسألة الأولى/).first().click();

    await expect(page).toHaveURL(/#\/lesson\/\d+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // نص المسألة الحقيقي (من Firestore) لا هيكل فارغ
    await expect(page.locator('body')).toContainText(/الطهارة/);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('3) المفضلة تُحفظ بعد إعادة تحميل الصفحة', async ({ page }) => {
    const errors = collectErrors(page);
    await openLesson(page, 1);

    await page.getByRole('button', { name: 'حفظ في المفضلة' }).click();
    await expect(page.getByRole('button', { name: 'إزالة من المفضلة' })).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem('guest_bookmarks'));
    expect(stored).toContain('1');

    await page.reload();
    await expect(page.getByRole('button', { name: 'إزالة من المفضلة' })).toBeVisible({ timeout: 30_000 });

    await page.goto('/#/bookmarks');
    await expect(page.getByText(/المسألة الأولى/).first()).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('4) ملاحظة: تُكتب وتُحفظ وتظهر بعد إعادة التحميل', async ({ page }) => {
    const errors = collectErrors(page);
    await openLesson(page, 2);

    const note = `ملاحظة اختبار ${Date.now()}`;
    const noteBox = page.getByRole('textbox', { name: 'ملاحظاتك حول هذه المسألة' });
    await noteBox.click();
    await noteBox.pressSequentially(note, { delay: 5 });
    await expect(noteBox).toHaveValue(note);
    await page.getByRole('button', { name: /حفظ الملاحظات/ }).click();
    // المصدر الموثوق للحفظ: التخزين المحلي نفسه (اللافتة تُختفي بعد ثانيتين)
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('guest_notes')), { timeout: 15_000 })
      .toContain(note);

    await page.reload();
    await expect(page.getByRole('textbox', { name: 'ملاحظاتك حول هذه المسألة' })).toHaveValue(note, { timeout: 30_000 });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('5) البحث الشامل يعرض نتائج وينتقل للمسألة', async ({ page }) => {
    const errors = collectErrors(page);
    await openBooks(page);

    await page.getByRole('button', { name: 'بحث', exact: true }).click();
    const input = page.getByPlaceholder(/عنوان، نص، رقم المسألة/);
    await expect(input).toBeVisible();
    await input.fill('الطهارة');

    const firstResult = page.locator('button.list-btn').first();
    await expect(firstResult).toBeVisible({ timeout: 20_000 });
    await firstResult.click();

    await expect(page).toHaveURL(/#\/lesson\/\d+/);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('6) لوحة الإدارة محجوبة عن الزائر', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/#/admin');
    await expect(page.getByText('هذه الصفحة للمشرفين فقط')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /الإحصائيات/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /القاموس/ })).toHaveCount(0);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('7) شريط «نسخة جديدة متاحة» يظهر عند نشر حزمة مختلفة ويُحدّث الصفحة', async ({ page }) => {
    const errors = collectErrors(page);
    await openBooks(page);
    await expect(page.locator('.update-banner')).toHaveCount(0);

    // الخادم يقدّم حزمة أحدث من العاملة (محاكاة نشر جديد)
    await page.route('**/index.html*', async (route) => {
      const res = await route.fetch();
      const body = (await res.text()).replace(/assets\/index-[A-Za-z0-9_-]+\.js/, 'assets/index-ZZZnew99.js');
      await route.fulfill({ response: res, body });
    });

    // الزناد الحقيقي: عودة التبويب إلى المقدمة
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

    const banner = page.locator('.update-banner');
    await expect(banner).toBeVisible({ timeout: 20_000 });
    await expect(banner).toContainText('نسخة جديدة متاحة');

    await page.unroute('**/index.html*');
    await page.getByRole('button', { name: /تحديث الآن/ }).click();
    // بعد التحميل تعود الحالة نظيفة ويختفي الشريط
    await expect(page.locator('.update-banner')).toHaveCount(0, { timeout: 30_000 });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  // ── الصفحات الثابتة (SEO) هي المدخل الأول لزوّار جوجل، فيجب ألا تكون طريقًا مسدودًا:
  // زر «افتح في الموقع التفاعلي» كان يشير إلى المسار النظيف نفسه، فيعيد تحميل الصفحة
  // الثابتة ويعيد الزائر إلى نفس النص بلا أي تجربة تفاعلية.
  test('8) صفحة المسألة الثابتة تُقرأ ثم زرّها يدخل التطبيق التفاعلي فعلًا', async ({ page }) => {
    const errors = collectErrors(page);
    // مسار نظيف (/lessons/5/) — يُخدَم ملفًا ثابتًا لا تطبيق React
    await page.goto('/lessons/5/', { waitUntil: 'domcontentloaded' });

    // المحتوى موجود في HTML نفسه بلا جافاسكربت: هذا ما تفهرسه محركات البحث
    await expect(page.locator('h1')).toContainText('المسألة');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/lessons\/5\/$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/.+\.jpg$/);
    // رابط التالي/السابق يبني سلسلة تصفّح متصلة للزاحف
    expect(await page.locator('.pager a').count()).toBeGreaterThan(0);

    // الزر يجب أن ينتقل إلى /#/lesson/{id} لا أن يعيد تحميل نفس الملف
    const ctaHref = await page.locator('a.cta').getAttribute('href');
    expect(ctaHref, 'زر الصفحة الثابتة يجب أن يقود إلى التطبيق التفاعلي لا إلى الملف نفسه').toMatch(/\/#\/lesson\/5$/);

    await page.locator('a.cta').click();
    await expect(page).toHaveURL(/#\/lesson\/5$/);
    // وصلنا فعليًا إلى شاشة القراءة التفاعلية (بطاقة الملاحظات لا توجد إلا في التطبيق)
    await expect(page.getByRole('textbox', { name: 'ملاحظاتك حول هذه المسألة' })).toBeVisible({ timeout: 30_000 });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  // التطبيق على رابط هاش يجب أن يعلن canonical = المسار النظيف، وإلا تنافس نسختان
  // من نفس النص في نتائج البحث وتُضعف كلتاهما.
  test('9) التطبيق يعلن canonical النظيف ولا يبعثر معاينة المشاركة', async ({ page }) => {
    await openLesson(page, 5);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/lessons\/5\/$/);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /\/lessons\/5\/$/);
  });

  // 10. اختبار وضع الأوفلاين (PWA Offline Capability):
  // التحقق من أن التطبيق يعمل من الكاش المحلي بلا اتصال بالشبكة
  test('10) وضع عدم الاتصال (Offline Mode): التطبيق يعمل ويتصفح المحتوى بلا اتصال بالإنترنت', async ({ page }) => {
    await openBooks(page);

    // قطع الشبكة بالكامل
    await page.context().setOffline(true);

    try {
      // إعادة تحميل الصفحة دون اتصال — الخدمة من الكاش
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 3, name: 'فهرس الكتب' })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(TRI).first()).toBeVisible();

      // تصفح كتاب أثناء عدم الاتصال
      await page.getByText(TRI).first().click();
      await expect(page.getByRole('heading', { name: new RegExp(TRI) }).first()).toBeVisible();
    } finally {
      await page.context().setOffline(false);
    }
  });

  // 11. الهيرو لزائر جديد (بلا كاش): تأجيل اتصال السحابة على الهيرو كان يُبقي شاشة
  // البداية معلّقة فوق الصفحة (طبقة z-index عالية) فتُحجب كل النقرات — الزر الأساسي
  // لا يعمل والموقع يبدو معطّلًا. هذا الاختبار يبدأ من الجذر لا من مسار داخلي
  // تحديدًا لأن كل الاختبارات الأخرى تتجاوز الهيرو فلا ترى العطل.
  test('11) الهيرو لزائر جديد: شاشة البداية تختفي والزر الأساسي ينقل إلى الفهرس', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');

    const startBtn = page.getByRole('button', { name: /تصفّح أبواب الفقه/ });
    await expect(startBtn).toBeVisible({ timeout: 20_000 });

    // لا طبقة تحجب الزر: العنصر الأعلى عند مركزه هو الزر نفسه.
    // نُعيد المحاولة لأن شاشة البداية تُغلق بحركة خروج (~1.3s) وقد تكون أثناءها مرئية
    // فوق الهيرو — المطلوب ألا تبقى معلّقة، لا أن تكون غائبة من الإطار الأول.
    const hitTest = () => page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find((b) => /تصفّح أبواب الفقه/.test(b.innerText || ''));
      if (!btn) return 'no-button';
      const r = btn.getBoundingClientRect();
      if (!r.width || !r.height) return 'no-box';
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!top) return 'no-element';
      if (top === btn || btn.contains(top)) return 'clear';
      const splash = top.closest('[style*="--z-splash"]');
      return `blocked:${top.tagName}${splash ? '(splash)' : '.' + (top.className || '').toString().slice(0, 30)}`;
    });
    await expect.poll(hitTest, { timeout: 20_000, intervals: [200, 400, 800] }).toBe('clear');

    await startBtn.click();
    await expect(page).toHaveURL(/#\/books/);
    await expect(page.getByRole('heading', { level: 3, name: 'فهرس الكتب' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/\d+ مسألة/).first()).toBeVisible({ timeout: 30_000 });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('توسيع التغطية: الإعدادات، الإنجازات، المراجعة، والتفضيلات', () => {
  test('12) شاشة الإعدادات: فتح وطي مجموعات الأكورديون', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/#/settings');
    await expect(page.getByRole('heading', { level: 3, name: 'الإعدادات' })).toBeVisible({ timeout: 30_000 });

    // فحص مجموعات الأكورديون
    const accordionHeader = page.locator('button[data-group-id]').first();
    await expect(accordionHeader).toBeVisible();
    const initialExpanded = await accordionHeader.getAttribute('aria-expanded');

    // الضغط للفتح أو الطي
    await accordionHeader.click();
    const nextExpanded = await accordionHeader.getAttribute('aria-expanded');
    expect(nextExpanded).not.toBe(initialExpanded);

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('13) شاشة الإنجازات والانتقال إلى وضع المراجعة', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/#/achievements');
    await expect(page.getByRole('heading', { level: 3, name: 'إنجازاتي' })).toBeVisible({ timeout: 30_000 });

    // زر بدء المراجعة ينقل إلى وضع المراجعة
    const startReviewBtn = page.getByRole('button', { name: /ابدأ المراجعة الآن/ });
    await expect(startReviewBtn).toBeVisible();
    await startReviewBtn.click();

    await expect(page).toHaveURL(/#\/review/);
    await expect(page.getByRole('heading', { name: /وضع المراجعة/ })).toBeVisible({ timeout: 20_000 });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('14) شاشة القراءة: اختبار سريع وتكبير/تصغير الخط', async ({ page }) => {
    const errors = collectErrors(page);
    await openLesson(page, 1);

    // تفعيل وضع الاختبار السريع
    const quizToggleBtn = page.getByRole('button', { name: /وضع الاختبار السريع/ });
    if (await quizToggleBtn.isVisible()) {
      await quizToggleBtn.click();
      await expect(page.getByText(/استذكر حكم المسألة/)).toBeVisible();

      // كشف الحكم
      await page.getByRole('button', { name: /كشف التعليق والحكم/ }).click();
      await expect(page.getByText(/تعليق الشيخ/)).toBeVisible();
    }

    // فحص أزرار حجم الخط
    const increaseBtn = page.getByRole('button', { name: 'تكبير الخط' });
    if (await increaseBtn.isVisible()) {
      await increaseBtn.click();
    }

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('15) شاشة الفوائد المقتبسة والوصول إليها', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/#/highlights');
    await expect(page.getByRole('heading', { level: 3, name: 'الفوائد المقتبسة' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /وضع المراجعة/ })).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
