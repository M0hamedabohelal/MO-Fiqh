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
    const lessons = [];
    let nextPageToken = '';
    do {
      const url = new URL(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.VITE_FIREBASE_PROJECT_ID)}/databases/(default)/documents/lessons`);
      url.searchParams.set('pageSize', '1000');
      url.searchParams.set('key', env.VITE_FIREBASE_API_KEY);
      if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);
      const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new Error(`Firestore REST returned HTTP ${response.status}`);
      const payload = await response.json();
      for (const document of payload.documents ?? []) {
        const decode = (value) => {
          if ('stringValue' in value) return value.stringValue;
          if ('integerValue' in value) return Number(value.integerValue);
          if ('doubleValue' in value) return value.doubleValue;
          if ('booleanValue' in value) return value.booleanValue;
          if ('nullValue' in value) return null;
          if ('timestampValue' in value) return value.timestampValue;
          if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
          if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, nested]) => [key, decode(nested)]));
          return undefined;
        };
        const data = Object.fromEntries(Object.entries(document.fields ?? {}).map(([key, value]) => [key, decode(value)]));
        lessons.push({ _docId: document.name.split('/').at(-1), ...data });
      }
      nextPageToken = payload.nextPageToken ?? '';
    } while (nextPageToken);
    const clean = validLessons(lessons);
    if (!clean?.length) return null;
    // القراءة العامة مسموحة للجميع (firestore.rules) — لا حاجة لمصادقة
    const lessonsData = clean;
    console.log(`🌐 SEO: استخدام السحابة الحية (${lessonsData.length} مسألة)`);
    return lessonsData;
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
// عند تعذّر السحابة قد تكون النسخة الاحتياطية أقدم من البيانات المحلية.
// ندمج المصدرين حسب id، مع أولوية النسخة الاحتياطية للمسائل المشتركة حتى لا نفقد مسائل أضيفت محليًا.
function mergeFallbackLessons(backup, local) {
  const merged = new Map(validLessons(local)?.map((lesson) => [String(lesson.id), lesson]) ?? []);
  validLessons(backup)?.forEach((lesson) => merged.set(String(lesson.id), lesson));
  return [...merged.values()];
}

const lessonsData = liveLessons ?? (backupLessons
  ? mergeFallbackLessons(backupLessons, localLessons)
  : validLessons(localLessons) ?? []);
if (liveLessons) {
  const fallbackIds = new Set((backupLessons ? mergeFallbackLessons(backupLessons, localLessons) : validLessons(localLessons) ?? [])
    .map((lesson) => String(lesson.id)));
  const liveIds = new Set(liveLessons.map((lesson) => String(lesson.id)));
  const missingFromLive = [...fallbackIds].filter((id) => !liveIds.has(id));
  if (missingFromLive.length > 0) {
    throw new Error(`❌ أوقف بناء SEO: السحابة تفتقد ${missingFromLive.length} معرّفًا موجودًا في النسخة المحلية/الاحتياطية (${missingFromLive.slice(0, 12).join(', ')}). راجع npm run audit:data ثم حدّث اللقطة المحلية قبل النشر.`);
  }
  const ids = liveLessons.map((lesson) => String(lesson.id));
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length > 0) {
    throw new Error(`❌ أوقف بناء SEO: معرّفات مكررة في بيانات السحابة (${duplicateIds.slice(0, 12).join(', ')}).`);
  }
}
if (!liveLessons && backupLessons) {
  console.log(`📦 SEO: دمج النسخة الاحتياطية والبيانات المحلية (${lessonsData.length} مسألة).`);
} else if (!liveLessons) {
  console.log(`📄 SEO: استخدام البيانات المحلية (${lessonsData.length} مسألة).`);
}
const { BOOKS_LIST } = await import('../src/data/books.ts');

// مساعدة: اسم آمن للمجلد (ترميز عربي URL-صديق)
const enc = (s) => encodeURIComponent((s || '').trim());
// ترميز معرف المسألة للروابط — دفاعيًا (المعرفات رقمية عادةً فلا يتغير شيء فعليًا،
// لكن معرفًا غريبًا قد يحقن علامات في href/canonical)
const encId = (id) => encodeURIComponent(String(id ?? ''));

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

// ترميز آمن لبيانات JSON-LD داخل وسم <script>: يمنع كسر الوسم عبر </script>
// من محتوى قادم من السحابة (عنوان/وصف فيه < > &) — تهريب يونيكود بدل HTML entities
function jsonLdString(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
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
<script type="application/ld+json">${jsonLdString(jsonld)}</script>
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
      `<li><a href="/lessons/${encId(l.id)}/">${escapeHtml(l.title)}</a></li>`,
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
  const url = `${BASE}/lessons/${encId(l.id)}/`;
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
    foot(`/#/lesson/${encId(l.id)}`)
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
lessonsData.forEach((l) => urls.push(`${BASE}/lessons/${encId(l.id)}/`));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(PUBLIC, 'sitemap.xml'), sitemap, 'utf8');

console.log(`✅ بريرندرينج: ${count} صفحة ثابتة (${bookNames.length} كتاب + ${lessonsData.length} مسألة) + sitemap.xml`);
