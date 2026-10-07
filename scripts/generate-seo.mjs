// سكربت بريرندرينج — يولّد صفحات HTML ثابتة (SEO) لكل كتاب ومسألة
// بمحتوى كامل + ميتا + JSON-LD في مسارات نظيفة، تُنسَخ تلقائيًا مع البناء.
// الاستخدام: node scripts/generate-seo.mjs  (يُشغَّل تلقائيًا قبل vite build)
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PUBLIC = join(root, 'public');
const BASE = 'https://www.fqh.me';

// ── البيانات ──
const { lessonsData } = await import('../src/data/lessons.js');
const { BOOKS_LIST } = await import('../src/data/books.js');

// مساعدة: اسم آمن للمجلد (ترميز عربي URL-صديق)
const enc = (s) => encodeURIComponent((s || '').trim());

// تجميع المسائل حسب الكتاب، مع ترتيب الكتب حسب الفهرس الرسمي
const bookOrder = {};
BOOKS_LIST.forEach((b, i) => (bookOrder[b] = i));
const byBook = {};
for (const l of lessonsData) {
  const b = (l.bookName || '').trim();
  if (!b) continue;
  (byBook[b] = byBook[b] || []).push(l);
}
const bookNames = Object.keys(byBook).sort(
  (a, b) => (bookOrder[a] ?? 999) - (bookOrder[b] ?? 999),
);

// مقتطف النص للوصف
const snippet = (t, n = 150) =>
  (t || '').replace(/\s+/g, ' ').trim().replace(/[\u064B-\u0652\u0670\u0640]/g, '').slice(0, n);

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PAGE_CSS = `
  body{background:#101414;color:#e6e8e6;font-family:'Amiri',serif;margin:0;padding:2rem 1rem;line-height:2}
  .wrap{max-width:780px;margin:auto}
  h1{color:#5cc0b5;font-size:1.7rem;text-align:center;margin-bottom:.3rem}
  .meta{color:#a9b1ad;text-align:center;margin-bottom:1.8rem;font-family:'Tajawal',sans-serif;font-size:.9rem}
  h2{color:#d8a06a;font-size:1.25rem;margin-top:1.6rem}
  ul{list-style:none;padding:0}
  li{margin:.5rem 0}
  a{color:#5cc0b5;text-decoration:none;border-bottom:1px dotted rgba(92,192,181,.5)}
  .breadcrumb{font-family:'Tajawal',sans-serif;font-size:.8rem;color:#a9b1ad;margin-bottom:1.5rem}
  .breadcrumb a{color:#a9b1ad;border:none}
  .quran{font-family:'Amiri Quran',serif;color:#81C784}
  .exp{background:#1a2020;border-right:4px solid #d8a06a;padding:1rem 1.2rem;border-radius:8px;margin-top:1.2rem}
  .exp h3{color:#d8a06a;font-size:1.05rem;margin-top:0}
  .cta{display:block;text-align:center;background:linear-gradient(135deg,#5cc0b5,#2a9d8f);color:#0f3d3e;padding:.9rem;border-radius:12px;font-weight:700;font-size:1.05rem;margin-top:2rem;border:none}
  .footer{color:#6a726e;text-align:center;margin-top:2.5rem;font-size:.8rem;font-family:'Tajawal',sans-serif}
  pre{white-space:pre-wrap;font-family:inherit;margin:0}`;

function head(title, desc, url, jsonld) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="الباحث الفقهي">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Amiri+Quran&family=Tajawal:wght@400;700&display=swap">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>${PAGE_CSS}</style>
</head>
<body><div class="wrap">`;
}

const foot = (appLink) => `
<a class="cta" href="${appLink}" rel="noopener">📖 افتح في التطبيق التفاعلي</a>
<div class="footer">الباحث الفقهي — منصة تعليم الفقه الإسلامي بأسلوب عصري ميسّر — <a href="/">fqh.me</a></div>
</div></body></html>`;

// ← توليد صفحات الكتب
function bookPage(name, lessons) {
  const url = `${BASE}/books/${enc(name)}/`;
  const desc = `${name} — ${lessonChapters(lessons).length} أبواب من المسائل الفقهية مع شرح الشيخ.`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name,
    numberOfPages: lessons.length,
    inLanguage: 'ar',
    url,
    publisher: { '@type': 'Organization', name: 'الباحث الفقهي', url: BASE },
  };

  const chapters = lessonChapters(lessons);
  const chaptersHtml = chapters
    .map(
      ([chName, chLessons]) => `
<h2>${escapeHtml(chName)}</h2>
<ul>
${chLessons
  .map(
    (l) =>
      `<li><a href="/lessons/${l.id}/">${escapeHtml(l.title)}</a></li>`,
  )
  .join('')}
</ul>`,
    )
    .join('');

  return (
    head(`${name} — الباحث الفقهي`, desc, url, jsonld) +
    `<div class="breadcrumb"><a href="/">الباحث الفقهي</a> › ${escapeHtml(name)}</div>
<p class="meta">${chapters.length} أبواب • ${lessons.length} مسألة (قراءة كاملة بدون تسجيل)</p>
<div class="meta">${escapeHtml(snippet(lessons[0]?.mainText, 160))}…</div>
${chaptersHtml}` +
    foot(`/#/book/${enc(name)}`)
  );
}

// ← توليد صفحات المسائل
function lessonPage(l) {
  const url = `${BASE}/lessons/${l.id}/`;
  const bookName = l.bookName || '';
  const desc = snippet(l.mainText, 155);
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: l.title,
    description: desc,
    inLanguage: 'ar',
    isPartOf: { '@type': 'Book', name: bookName },
    url,
    publisher: { '@type': 'Organization', name: 'الباحث الفقهي', url: BASE },
  };

  // تنسيق نص المتن: استبدال أقواس الآيات بعلامات ملونة
  const mainText = escapeHtml(l.mainText || '').replace(
    /\{([\s\S]*?)\}/g,
    '<span class="quran">﴿$1﴾</span>',
  );

  return (
    head(`${l.title} — ${bookName} — الباحث الفقهي`, desc, url, jsonld) +
    `<div class="breadcrumb"><a href="/">الرئيسية</a> › <a href="/books/${enc(bookName)}/">${escapeHtml(bookName)}</a> › ${escapeHtml(l.title)}</div>
<pre>${mainText}</pre>
${l.sheikhExplanation ? `<div class="exp"><h3>📖 تعليق الشيخ</h3><pre>${escapeHtml(l.sheikhExplanation)}</pre></div>` : ''}` +
    foot(`/#/lesson/${l.id}`)
  );
}

function lessonChapters(lessons) {
  const map = new Map();
  for (const l of lessons) {
    const ch = (l.chapterName || '').trim() || '—';
    if (!map.has(ch)) map.set(ch, []);
    map.get(ch).push(l);
  }
  return [...map.entries()];
}

// ── التنظيف والكتابة ──
rmSync(join(PUBLIC, 'books'), { recursive: true, force: true });
rmSync(join(PUBLIC, 'lessons'), { recursive: true, force: true });

let count = 0;
for (const name of bookNames) {
  const lessons = byBook[name];
  const dir = join(PUBLIC, 'books', enc(name));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), bookPage(name, lessons), 'utf8');
  count += 1;
}

for (const l of lessonsData) {
  const dir = join(PUBLIC, 'lessons', String(l.id));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), lessonPage(l), 'utf8');
  count += 1;
}

// ── sitemap شامل ──
const urls = [`${BASE}/`];
bookNames.forEach((n) => urls.push(`${BASE}/books/${enc(n)}/`));
lessonsData.forEach((l) => urls.push(`${BASE}/lessons/${l.id}/`));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(PUBLIC, 'sitemap.xml'), sitemap, 'utf8');

console.log(`✅ بريرندرينج: ${count} صفحة ثابتة (${bookNames.length} كتاب + ${lessonsData.length} مسألة) + sitemap.xml`);
