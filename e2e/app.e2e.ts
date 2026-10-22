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
  await expect(page.getByRole('heading', { name: 'فهرس الكتب' })).toBeVisible();
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
});
