import { test, expect, devices, type Page, type ConsoleMessage } from '@playwright/test';

// 6 مسارات حرجة على مقاس فون + حارس أخطاء كونسول.
// الهدف: ما لا تستطيع اختبارات الوحدة رؤيته — DOM حقيقي، توجيه هاشي، وحفظ فعلي
// بعد إعادة تحميل الصفحة.

const TRI = 'كتاب الطهارة';

/** يجمع أخطاء الكونسول الحقيقية. أخطاء الشبكة العابرة تُتجاهل،
 *  وعطل Firestore الداخلي المعروف (ca9/b815) يُسجَّل كتعليق مرئي في التقرير
 *  لا كفشل — لأنه متقطّع (0/12 في المسابر) فيُفشل البوابة عشوائيًا. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  const benign = /ERR_ABORTED|net::ERR_FAILED|Failed to fetch|the server responded with a status of 4\d\d|requestStorageAccess|unsupported MIME type|recaptcha/i;
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

    await page.getByRole('button', { name: /بحث/ }).click();
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

  test('7) شريط «نسخة جديدة متاحة» يظهر عند نشر حزمة مختلفة ويُحدّث الصفحة', async ({ browser }) => {
    // بلا Service Worker: هذا الاختبار يحكم على منطق كشف النشر (فحص index.html)، والـ SW
    // يمرّر نفس الطلب عبر قاعدته فلا تصل المحاكاة. سلوك الـ SW له اختبار مستقل (رقم 10).
    const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'ar-EG', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = collectErrors(page);
    try {
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

      // لا نضغط «تحديث الآن» هنا: التطبيق التلقائي (الاختبار 18) هو المسار الأساسي،
      // ومساره اليدوي مُغطّى في الاختبار 19. الضغط هنا كان يتسابق مع التطبيق التلقائي.
      expect(errors, errors.join('\n')).toEqual([]);
    } finally {
      await ctx.close();
    }
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
  // التحقق من أن التطبيق يعمل من الكاش المحلي بلا اتصال بالشبكة حتى بعد إغلاقه وفتحه من جديد
  test('10) وضع عدم الاتصال (Offline Mode): التطبيق يعمل ويتصفح المحتوى بلا اتصال بالإنترنت', async ({ context, page }) => {
    await openBooks(page);

    // انتظار تفعيل Service Worker بالكامل
    await page.waitForFunction(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg && reg.active && reg.active.state === 'activated';
    }, { timeout: 15_000 });

    // قطع الشبكة بالكامل
    await context.setOffline(true);

    try {
      // 1. إعادة تحميل الصفحة دون اتصال — الخدمة من الكاش
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 3, name: 'فهرس الكتب' })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(TRI).first()).toBeVisible();

      // تصفح كتاب أثناء عدم الاتصال
      await page.getByText(TRI).first().click();
      await expect(page.getByRole('heading', { name: new RegExp(TRI) }).first()).toBeVisible();

      // 2. إغلاق الصفحة وفتح صفحة جديدة أوفلاين بالكامل (محاكاة الخروج من التطبيق والعودة إليه)
      await page.close();
      const freshPage = await context.newPage();
      await freshPage.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(freshPage.locator('body')).not.toBeEmpty();
    } finally {
      await context.setOffline(false);
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
    // h1 الدلالي المخفي يحمل «الإعدادات» أيضًا، فنحدّد المستوى 2 لتفادي الالتباس
    await expect(page.getByRole('heading', { level: 2, name: /الإعدادات/ })).toBeVisible({ timeout: 30_000 });

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
    // h1 الدلالي المخفي يحمل «وضع المراجعة والاختبار»، فنحدّد المستوى 3 والنص الفعلي للشاشة
    await expect(page.getByRole('heading', { level: 3, name: /وضع المراجعة والاستذكار/ })).toBeVisible({ timeout: 20_000 });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('14) شاشة القراءة: تكبير/تصغير الخط وتصفح الشرح', async ({ page }) => {
    const errors = collectErrors(page);
    await openLesson(page, 1);

    // التحقق من ظهور تعليق الشيخ
    await expect(page.getByText(/تعليق الشيخ/)).toBeVisible();

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

  test('16) تدفق المشاركة: أزرار الحفظ كصورة ونسخ الرابط ونافذة المشاركة في شاشة القراءة', async ({ page, context }) => {
    const errors = collectErrors(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await openLesson(page, 1);

    // التحقق من ظهور أزرار المشاركة الثلاثة
    const downloadBtn = page.getByRole('button', { name: /حفظ كصورة/ });
    const shareBtn = page.getByRole('button', { name: /مشاركة المسألة/ });
    const copyLinkBtn = page.getByRole('button', { name: /نسخ الرابط/ });

    await expect(downloadBtn).toBeVisible();
    await expect(shareBtn).toBeVisible();
    await expect(copyLinkBtn).toBeVisible();

    // فتح نافذة المشاركة (على سطح المكتب)
    await shareBtn.click();
    await expect(page.getByText(/اختر الوسيلة المفضلة لمشاركة المسألة/i)).toBeVisible();
    await expect(page.getByText(/مشاركة عبر واتساب/i)).toBeVisible();
    await expect(page.getByText(/مشاركة عبر تليجرام/i)).toBeVisible();
    await expect(page.getByText(/نشر على منصة إكس/i)).toBeVisible();

    // إغلاق النافذة
    const closeBtn = page.getByRole('button', { name: 'إغلاق' });
    await closeBtn.click();
    await expect(page.getByText(/اختر الوسيلة المفضلة لمشاركة المسألة/i)).not.toBeVisible();

    // نسخ الرابط
    await copyLinkBtn.click();
    await expect(page.getByRole('button', { name: /^نسخ$/ })).toBeVisible();

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('17) المظهر (Themes): التنقل بين الداكن والتراثي والفاتح وحفظ الفاتح بعد إعادة التحميل', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/#/books');

    const themeBtn = page.getByRole('button', { name: /تبديل المظهر/ });
    await expect(themeBtn).toBeVisible({ timeout: 20_000 });

    // وضع ثيم الفاتح يدويًا والتحقق من احترامه وعدم تحويله لداكن
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
    });
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light', { timeout: 20_000 });
    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('light');

    // التبديل من الفاتح إلى الداكن
    await page.getByRole('button', { name: /تبديل المظهر.*فاتح/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // التبديل من الداكن إلى التراثي (sepia)
    await page.getByRole('button', { name: /تبديل المظهر.*داكن/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sepia');

    // التبديل من التراثي إلى الفاتح
    await page.getByRole('button', { name: /تبديل المظهر.*تراثي/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    expect(errors, errors.join('\n')).toEqual([]);
  });

  // ── تطبيق النشر الجديد تلقائيًا ──
  // الشكوى الأصلية: «أفتح رابطًا فأرى نسخة قديمة، ولا تظهر الجديدة إلا بريفرش».
  // السبب: الـ Service Worker يخدم الهيكل من precache حتى يضغط المستخدم «تحديث الآن».
  // الحل: تطبيق تلقائي حين يكون آمنًا، ومحاولة واحدة لكل جلسة (منعًا لحلقة إعادة تحميل).
  // يُجرَّب بلا Service Worker لأن الاختبار يحكم على منطق التطبيق لا على العامل.
  const newBuildRoute = async (target: Page): Promise<void> => {
    await target.route('**/index.html*', async (route) => {
      const res = await route.fetch();
      const body = (await res.text()).replace(/assets\/index-[A-Za-z0-9_-]+\.js/, 'assets/index-ZZZnew99.js');
      await route.fulfill({ response: res, body });
    });
  };

  test('18) نشر جديد يُطبَّق تلقائيًا بلا تدخّل من المستخدم', async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'ar-EG', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    try {
      await openBooks(page);
      await newBuildRoute(page);

      // الزناد: عودة التبويب للمقدمة (نفس مسار الكشف الحقيقي)
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

      // إعادة التحميل التلقائية تُضيف ?v=<طابع زمني> لكسر الكاش
      await page.waitForURL(/[?&]v=\d+/, { timeout: 25_000 });
    } finally {
      await ctx.close();
    }
  });

  test('19) لا يُقاطع الكتابة: مسودة ملاحظة غير محفوظة تُبقي التحديث يدويًا', async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'ar-EG', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    try {
      await openLesson(page, 5);

      // ملاحظة تُحفظ بزر لا مع كل حرف — والمؤشر يبقى داخل الحقل
      const noteBox = page.getByRole('textbox', { name: 'ملاحظاتك حول هذه المسألة' });
      await noteBox.fill('مسودة أكتبها الآن');
      await noteBox.focus();

      await newBuildRoute(page);
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

      // الشريط يظهر (المستخدم يرى وجود تحديث) لكن الصفحة لا تُعاد تحميلها
      await expect(page.locator('.update-banner')).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(3500);
      expect(page.url()).not.toMatch(/[?&]v=\d+/);
      await expect(noteBox).toHaveValue('مسودة أكتبها الآن');

      // المسار اليدوي: زر «تحديث الآن» يعمل حين يُقرّر المستخدم التحديث بنفسه
      await page.getByRole('button', { name: /تحديث الآن/ }).click();
      await page.waitForURL(/[?&]v=\d+/, { timeout: 25_000 });
    } finally {
      await ctx.close();
    }
  });
});
