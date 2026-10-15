// سكربت بريرندرينج — يولّد صفحات HTML ثابتة (SEO) لكل كتاب ومسألة
// بمحتوى كامل + ميتا + JSON-LD في مسارات نظيفة، تُنسَخ تلقائيًا مع البناء.
// الاستخدام: node scripts/generate-seo.mjs  (يُشغَّل تلقائيًا قبل vite build)
import { mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PUBLIC = join(root, 'public');
const BASE = 'https://www.fqh.me';

// ── البيانات: السحابة الحية أولًا، ثم أحدث نسخة احتياطية، ثم المحلية ──
// بهذا تعكس صفحات SEO تعديلات لوحة الإدارة لحظة البناء بدل التأخر بعمر النسخة.
function loadEnvLocal() {
  try {
    const env = {};
    for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
}

// تحقق شكلي: مصفوفة غير فارغة وكل عنصر له id وعنوان — نسخة فاسدة تُرفض للاحتياطي التالي
function validLessons(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const clean = arr.filter((l) => l && l.id != null && String(l.title || '').trim());
  if (clean.length === 0) return null;
  if (clean.length < arr.length) {
    console.warn(`⚠️ SEO: تجاهل ${arr.length - clean.length} عناصر فاسدة بلا id/عنوان.`);
  }
  return clean.map(({ _docId, ...rest }) => rest);
}

async function loadLiveLessons() {
  try {
    const env = loadEnvLocal();
    if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID || !env.VITE_FIREBASE_APP_ID) {
      return null; // بلا مفاتيح — للاحتياطي التالي
    }
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, collection, getDocs } = await import('firebase/firestore');
    const app = initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    });
    const snap = await getDocs(collection(getFirestore(app), 'lessons'));
    // القراءة العامة مسموحة للجميع (firestore.rules) — لا حاجة لمصادقة
    const lessons = validLessons(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
    if (lessons) console.log(`🌐 SEO: استخدام السحابة الحية (${lessons.length} مسألة)`);
    return lessons;
  } catch (e) {
    console.warn('⚠️ SEO: تعذّر القراءة الحية — للاحتياطي التالي:', e?.message);
    return null;
  }
}

function loadBackupLessons() {
  try {
    const backupsDir = join(root, 'backups');
    if (!existsSync(backupsDir)) return null;
    const files = readdirSync(backupsDir)
      .filter((f) => f.startsWith('firestore-backup-') && f.endsWith('.json'))
      .map((f) => {
        // الأحدث باسم الطابع الزمني أولًا (مستقر ضد عبث أوقات الملفات)، ثم mtime
        const m = f.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})/);
        const stamp = m ? `${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}` : '';
        return { f, stamp, mtime: statSync(join(backupsDir, f)).mtimeMs };
      })
      .sort((a, b) => (b.stamp.localeCompare(a.stamp)) || (b.mtime - a.mtime));
    for (const { f } of files) {
      const payload = JSON.parse(readFileSync(join(backupsDir, f), 'utf8'));
      const lessons = validLessons(payload?.collections?.lessons);
      if (lessons) {
        console.log(`📦 SEO: استخدام ${f} (${lessons.length} مسألة من نسخة احتياطية)`);
        return lessons;
      }
      console.warn(`⚠️ SEO: نسخة ${f} فاسدة — تجاوزها للتالية.`);
    }
  } catch (e) {
    console.warn('⚠️ SEO: تعذّر قراءة backups:', e?.message);
  }
  return null;
}

const liveLessons = await loadLiveLessons();
const backupLessons = liveLessons ? null : loadBackupLessons();
const { lessonsData: localLessons } = await import('../src/data/lessons.ts');
const lessonsData = liveLessons ?? backupLessons ?? localLessons;
if (!liveLessons && !backupLessons) console.log('📄 SEO: استخدام البيانات المحلية.');
const { BOOKS_LIST } = await import('../src/data/books.ts');

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

// توقيت "hh:mm:ss" → ثوانٍ لجزء #t= (يبدأ الصوت/الفيديو من موضع المسألة حتى في الصفحة الثابتة)
const toSeconds = (t) => {
  if (!t) return 0;
  const s = String(t).trim();
  if (!s) return 0;
  if (!s.includes(':')) { const n = parseInt(s, 10); return Number.isFinite(n) && n >= 0 ? n : 0; }
  const p = s.split(':').map(Number);
  if (p.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return 0;
};

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
${l.audioUrl ? (() => { const s = toSeconds(l.startTime); const e = toSeconds(l.endTime); const frag = s > 0 ? `#t=${s}${e > s ? `,${e}` : ''}` : ''; return `<div class="exp"><h3>🎧 استمع للدرس</h3><audio controls preload="none" src="${escapeHtml(l.audioUrl)}${frag}" style="width:100%"></audio><br><a href="${escapeHtml(l.audioUrl)}${frag}" rel="noopener">تحميل الصوت (MP3)</a></div>`; })() : ''}
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
