import fs from 'node:fs';
import path from 'node:path';

const get = (html, re) => (html.match(re) || [])[1] || '(missing)';

const show = (label, file) => {
  const h = fs.readFileSync(file, 'utf8');
  const w = get(h, /og:image:width" content="(\d+)/);
  const hh = get(h, /og:image:height" content="(\d+)/);
  const img = get(h, /og:image" content="([^"]+)/);
  const canon = get(h, /rel="canonical" href="([^"]+)/);
  const cta = get(h, /class="cta" href="([^"]+)/);
  let pretty = img;
  try { pretty = decodeURIComponent(img).replace('https://fqh.me', ''); } catch { /* ignore */ }
  console.log(`${label.padEnd(7)} | og ${w}x${hh} | ${pretty}`);
  console.log(`        canonical=${decodeURIComponent(canon)}`);
  console.log(`        cta=${cta}`);
};

show('lesson', 'public/lessons/1/index.html');
show('book', 'public/books/كتاب الطهارة/index.html');
show('books-hub', 'public/books/index.html');
show('hub', 'public/lessons/index.html');
show('about', 'public/about/index.html');
show('privacy', 'public/privacy/index.html');

// فحص شامل: كل صفحة ثابتة لها صورة معاينة بأبعاد معلنة و canonical وزرّ يقود للتطبيق
let pages = 0;
const problems = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) {
    problems.push(`المجلد غير موجود: ${dir}`);
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name === 'index.html') {
      pages += 1;
      const h = fs.readFileSync(p, 'utf8');
      if (!/og:image" content="/.test(h)) problems.push(`${p}: بلا og:image`);
      if (!/og:image:width/.test(h)) problems.push(`${p}: بلا أبعاد og`);
      if (!/rel="canonical"/.test(h)) problems.push(`${p}: بلا canonical`);
      const cta = get(h, /class="cta" href="([^"]+)/);
      if (!cta.startsWith('/#')) problems.push(`${p}: الزر لا يقود إلى التطبيق (${cta})`);
      // التحقق من وجود JSON-LD و BreadcrumbList
      if (!h.includes('application/ld+json')) problems.push(`${p}: بلا JSON-LD`);
      if (!h.includes('BreadcrumbList')) problems.push(`${p}: بلا BreadcrumbList في بيانات Schema`);
      if (!h.includes('content="يَسِّر"')) problems.push(`${p}: بلا اسم الموقع الرسمي (يَسِّر)`);
      // canonical/og:url لا يجوز أن يشير إلى نطاق يحوِّل (www → apex بـ 301)
      if (/https:\/\/www\.fqh\.me/.test(h)) problems.push(`${p}: رابط مطلق على www المحوِّل`);
    }
  }
};
walk('public/lessons');
walk('public/books');
walk('public/about');
walk('public/privacy');
walk('public/terms');
walk('public/disclaimer');
walk('public/copyright');

// فحص الصفحات القانونية وصفحة عن المنصة صراحةً
const requiredPages = ['about', 'privacy', 'terms', 'disclaimer', 'copyright'];
for (const req of requiredPages) {
  const filePath = path.join('public', req, 'index.html');
  if (!fs.existsSync(filePath)) {
    problems.push(`الصفحة الإلزامية غير موجودة: ${filePath}`);
  }
}

// فحص روابط الفوتر في صفحة الفهرس
const hubHtml = fs.readFileSync('public/lessons/index.html', 'utf8');
for (const req of requiredPages) {
  if (!hubHtml.includes(`/${req}/`)) {
    problems.push(`فوتر الفهرس يفتقد رابط /${req}/`);
  }
}

// فحص sitemap.xml للتأكد من شمول الصفحات الإلزامية
const sitemapContent = fs.existsSync('public/sitemap.xml') ? fs.readFileSync('public/sitemap.xml', 'utf8') : '';
for (const req of requiredPages) {
  if (!sitemapContent.includes(`https://fqh.me/${req}/`)) {
    problems.push(`sitemap.xml يفتقد رابط https://fqh.me/${req}/`);
  }
}

// فحص index.html الرئيسي للتأكد من وجود Schema WebSite و Organization والاسم الرسمي
const rootHtml = fs.readFileSync('index.html', 'utf8');
if (!rootHtml.includes('"WebSite"')) problems.push('index.html: غياب Schema WebSite');
if (!rootHtml.includes('"Organization"')) problems.push('index.html: غياب Schema Organization');
if (!rootHtml.includes('"sameAs"')) problems.push('index.html: غياب روابط sameAs الرسمية في Organization');
if (!rootHtml.includes('name="robots"')) problems.push('index.html: غياب meta robots');
if (!rootHtml.includes('favicon.ico')) problems.push('index.html: غياب رابط favicon.ico');
if (!rootHtml.includes('google-site-verification')) problems.push('index.html: غياب meta google-site-verification');

console.log(`\nصفحات ثابتة: ${pages} | مشاكل: ${problems.length}`);
problems.slice(0, 10).forEach((p) => console.log('  ✗', p));
// فشل صريح في CI بدل تقرير يُقرأ بالعين فقط — الصفحات الثابتة هي مدخل محركات البحث
// وأي كسر صامت فيها (زر يقود لنفسه، صورة معاينة غائبة) لا يظهر في اختبارات التطبيق.
if (problems.length > 0) process.exitCode = 1;
