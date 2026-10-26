// سكربت بريرندرينج — يولّد صفحات HTML ثابتة (SEO) لكل كتاب ومسألة
// بمحتوى كامل + ميتا + JSON-LD في مسارات نظيفة، تُنسَخ تلقائيًا مع البناء.
// الاستخدام: node scripts/generate-seo.mjs  (يُشغَّل تلقائيًا قبل vite build)
import { mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PUBLIC = join(root, 'public');
// النطاق الأساسي للروابط المطلقة (canonical / og:url / sitemap).
// مهم: www.fqh.me يحوّل بـ 301 إلى fqh.me، فالـ canonical يجب أن يكون الرابط النهائي
// (fqh.me) لا المحوِّل — وإلا أعلنّا لكل صفحة «النسخة الأصلية عندي على رابط يُحوِّل»،
// وهو إشارة متناقضة تُضعف الفهرسة.
const BASE = 'https://fqh.me';

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

// ── حارس تقادم اللقطة المضمّنة (src/data/lessons.ts) ──
// اللقطة لم تعد تُعرض للمستخدم وقت التشغيل (المحتوى: سحابة ← كاش ← حالة خطأ صريحة)،
// لكنها ما زالت مدخل صفحات SEO ومقارنة لوحة الإدارة؛ فإن تقادمت يضيع التنبيه الإداري.
// تنبيه غير مُوقف للبناء (البناء يجب ألا يفشل لأن المحتوى تغيّر)، والفحص الصارم عبر
// `npm run check:content` في CI بعد التحديث.
if (liveLessons) {
  const localCount = (validLessons(localLessons) ?? []).length;
  const liveCount = liveLessons.length;
  if (localCount !== liveCount) {
    const diff = liveCount - localCount;
    console.warn(
      `⚠️  لقطة المحتوى المضمّنة متقادمة: ${localCount} من ${liveCount} مسألة` +
      (diff > 0 ? ` (ناقصة ${diff})` : ` (زائدة ${-diff})`) +
      '. شغّل `npm run content:snapshot` قبل النشر لتحديث مقارنة لوحة الإدارة.',
    );
  }
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
  pre{white-space:pre-wrap;font-family:inherit;margin:0}
  .pager{display:flex;gap:.6rem;justify-content:space-between;margin-top:2rem;font-family:'Tajawal',sans-serif;font-size:.9rem}
  .pager a{flex:1;background:#1a2020;border:1px solid rgba(92,192,181,.25);border-radius:10px;padding:.7rem .8rem;text-align:center;border-bottom:1px solid rgba(92,192,181,.25)}
  .pager a span{display:block;color:#6a726e;font-size:.72rem;margin-bottom:.2rem}
  .pager .empty{flex:1}
  h3.chapter{color:#8fa39c;font-size:.95rem;margin:1rem 0 .3rem;font-family:'Tajawal',sans-serif;font-weight:600}
  .hub li a{border-bottom:none}
  .hub ul{margin:0 0 .8rem}
  .hub h2{margin-top:2rem;border-top:1px solid rgba(92,192,181,.15);padding-top:1.2rem}
  .hub h2 a{border-bottom:none}
  @media(max-width:520px){.pager{flex-direction:column}}`;

// صورة المشاركة: كتاب له صورته، والمسألة تشارك صورة كتابها حتى لا تبقى الميتا بلا صورة.
// الأبعاد تتبع الملف فعليًا — إعلان 1024×1024 لصورة 1200×630 يخرب قصّ البطاقة في تيليجرام/واتساب.
// مكان الصور /og/ خارج /books/ و /lessons/ عمدًا: قواعد الكاش في firebase.json تجعل كل
// ما تحت هذين المسارين HTML بلا كاش، ولو وُضعت الصور تحتهما لاحتاجت تعارضًا في الترتيب.
const OG_DEFAULT = `${BASE}/og-image.jpg`;
const OG_BOOK_SIZE = { width: 1200, height: 630 };
const OG_DEFAULT_SIZE = { width: 1024, height: 1024 }; // ملف الهوية الحالي (مربّع)
const ogImageFor = (bookName) =>
  bookName
    ? { url: `${BASE}/og/${enc(bookName)}.jpg`, ...OG_BOOK_SIZE }
    : { url: OG_DEFAULT, ...OG_DEFAULT_SIZE };

// زر "افتح في الموقع التفاعلي" — يفتح هاش التطبيق (/ #/lesson/id) لا الملف الثابت نفسه،
// فالنقر على القناة الصحيحة ينقل الزائر إلى شاشة القراءة التفاعلية.
function head({ title, desc, url, jsonld, ogType = 'article', ogImage = ogImageFor(null), prev = null, next = null }) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.ico" sizes="48x48 32x32 16x16">
<link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml">
<link rel="icon" type="image/png" sizes="48x48" href="/icons/icon-48.png">
${prev ? `<link rel="prev" href="${prev}">` : ''}
${next ? `<link rel="next" href="${next}">` : ''}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="يَسِّر">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage.url}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="${ogImage.width}">
<meta property="og:image:height" content="${ogImage.height}">
<meta property="og:image:alt" content="${escapeHtml(title)}">
<meta property="og:locale" content="ar_AR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${ogImage.url}">
<link rel="stylesheet" href="/fonts/fonts.css">
<script type="application/ld+json">${jsonLdString(jsonld)}</script>
<style>${PAGE_CSS}</style>
</head>
<body><div class="wrap">`;
}

const foot = (appLink) => `
<a class="cta" href="${appLink}" rel="noopener">📖 افتح في الموقع التفاعلي</a>
<div class="footer">يَسِّر — منصة تعليم الفقه الإسلامي بأسلوب عصري ميسّر — <a href="/">fqh.me</a> · <a href="/lessons/">كل المسائل</a></div>
</div></body></html>`;

// ← توليد صفحات الكتب
function bookPage(name, lessons) {
  const url = `${BASE}/books/${enc(name)}/`;
  const desc = `${name} — ${lessonChapters(lessons).length} أبواب من المسائل الفقهية مع شرح الشيخ.`;
  const bookLd = {
    '@type': 'Book',
    name,
    numberOfPages: lessons.length,
    inLanguage: 'ar',
    url,
    publisher: { '@type': 'Organization', name: 'يَسِّر', url: BASE },
  };
  const breadcrumbLd = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'فهرس المسائل', item: `${BASE}/lessons/` },
      { '@type': 'ListItem', position: 3, name, item: url },
    ],
  };
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [bookLd, breadcrumbLd],
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

  const siblings = bookNames.filter((b) => b !== name);
  const otherBooks = siblings.length
    ? `\n<h2>كتب أخرى</h2>\n<ul>${siblings.map((b) => `<li><a href="/books/${enc(b)}/">${escapeHtml(b)}</a></li>`).join('')}</ul>`
    : '';

  return (
    head({
      title: `${name} — يَسِّر`,
      desc,
      url,
      jsonld,
      ogType: 'book',
      ogImage: ogImageFor(name),
    }) +
    `<div class="breadcrumb"><a href="/">يَسِّر</a> › ${escapeHtml(name)}</div>
<h1>${escapeHtml(name)}</h1>
<p class="meta">${chapters.length} أبواب • ${lessons.length} مسألة (قراءة كاملة بدون تسجيل)</p>
<div class="meta">${escapeHtml(snippet(lessons[0]?.mainText, 160))}…</div>
${chaptersHtml}${otherBooks}` +
    // الزر يقود إلى التطبيق التفاعلي (هاش) — لا إلى هذا الملف نفسه، وإلا أعاد تحميل
    // الصفحة الثابتة نفسها ولم يصل الزائر إلى تجربة القراءة التفاعلية أبدًا.
    foot(`/#/book/${enc(name)}`)
  );
}

// ← توليد صفحات المسائل
// prev/next بالسابق والتالي الفعليين في المحتوى (المعرّفات بها فجوات: 11–16 و78)،
// فيسير القارئ والزاحف على سلسلة متصلة من الروابط بدل الاعتماد على الحساب العددي.
function lessonPage(l, bookLessons, bookName) {
  const url = `${BASE}/lessons/${encId(l.id)}/`;
  const idx = bookLessons.findIndex((x) => String(x.id) === String(l.id));
  const prevLesson = idx > 0 ? bookLessons[idx - 1] : null;
  const nextLesson = idx >= 0 && idx < bookLessons.length - 1 ? bookLessons[idx + 1] : null;
  const prevUrl = prevLesson ? `${BASE}/lessons/${encId(prevLesson.id)}/` : null;
  const nextUrl = nextLesson ? `${BASE}/lessons/${encId(nextLesson.id)}/` : null;
  const desc = snippet(l.mainText, 155);
  const articleLd = {
    '@type': 'Article',
    headline: l.title,
    description: desc,
    inLanguage: 'ar',
    isPartOf: { '@type': 'Book', name: bookName },
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    publisher: { '@type': 'Organization', name: 'يَسِّر', url: BASE },
  };
  const breadcrumbLd = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'فهرس المسائل', item: `${BASE}/lessons/` },
      { '@type': 'ListItem', position: 3, name: bookName, item: `${BASE}/books/${enc(bookName)}/` },
      { '@type': 'ListItem', position: 4, name: l.title, item: url },
    ],
  };
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [articleLd, breadcrumbLd],
  };

  // تنسيق نص المتن: استبدال أقواس الآيات بعلامات ملونة
  const mainText = escapeHtml(l.mainText || '').replace(
    /\{([\s\S]*?)\}/g,
    '<span class="quran">﴿$1﴾</span>',
  );

  const pager = `
<div class="pager">
${prevLesson ? `<a href="/lessons/${encId(prevLesson.id)}/" rel="prev"><span>‹ السابق</span>${escapeHtml(prevLesson.title)}</a>` : '<div class="empty"></div>'}
${nextLesson ? `<a href="/lessons/${encId(nextLesson.id)}/" rel="next"><span>التالي ›</span>${escapeHtml(nextLesson.title)}</a>` : '<div class="empty"></div>'}
</div>`;

  return (
    head({
      title: `${l.title} — ${bookName} — يَسِّر`,
      desc,
      url,
      jsonld,
      ogImage: ogImageFor(bookName),
      prev: prevUrl,
      next: nextUrl,
    }) +
    `<div class="breadcrumb"><a href="/">الرئيسية</a> › <a href="/books/${enc(bookName)}/">${escapeHtml(bookName)}</a> › ${escapeHtml(l.title)}</div>
<h1>${escapeHtml(l.title)}</h1>
<pre>${mainText}</pre>
${l.audioUrl ? (() => { const s = toSeconds(l.startTime); const e = toSeconds(l.endTime); const frag = s > 0 ? `#t=${s}${e > s ? `,${e}` : ''}` : ''; return `<div class="exp"><h3>🎧 استمع للدرس</h3><audio controls preload="none" src="${escapeHtml(l.audioUrl)}${frag}" style="width:100%"></audio><br><a href="${escapeHtml(l.audioUrl)}${frag}" rel="noopener">تحميل الصوت (MP3)</a></div>`; })() : ''}
${l.sheikhExplanation ? `<div class="exp"><h3>📖 تعليق الشيخ</h3><pre>${escapeHtml(l.sheikhExplanation)}</pre></div>` : ''}
${pager}` +
    foot(`/#/lesson/${encId(l.id)}`)
  );
}

// ← صفحة فهرس كل المسائل (/lessons/) — محور ربط داخلي
// الصفحات الثابتة كانت موجودة لكن يتيمة: لا رابط داخلي واحد يقود إليها غير sitemap.
// هذه الصفحة تجمع كل المسائل في صفحة واحدة، وكل صفحة ثابتة تربط بها من الفوتر، فيصير
// للزحف مسار واضح: الرئيسية ← الأبواب ← هذا الفهرس ← المسألة ← التالية/السابقة.
// (لا نكتب public/index.html: هو مقصد Vite نفسه وكتابتنا فوقه تُستبدل أو تتصادم.)
function lessonsIndexPage() {
  const url = `${BASE}/lessons/`;
  const desc = `كل مسائل الكتب الفقهية في صفحة واحدة — ${lessonsData.length} مسألة موثّقة بنصها وتعليق الشيخ، قراءة كاملة بدون تسجيل.`;
  const collectionLd = {
    '@type': 'CollectionPage',
    name: 'كل المسائل',
    description: desc,
    inLanguage: 'ar',
    url,
    isPartOf: { '@type': 'WebSite', name: 'يَسِّر', url: `${BASE}/` },
    publisher: { '@type': 'Organization', name: 'يَسِّر', url: BASE },
  };
  const breadcrumbLd = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'كل المسائل', item: url },
    ],
  };
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [collectionLd, breadcrumbLd],
  };

  const groupsHtml = bookNames
    .map((name) => {
      const bookLessons = bookLessonsSorted[name] ?? [];
      const chapters = lessonChapters(bookLessons);
      return `<h2><a href="/books/${enc(name)}/">${escapeHtml(name)}</a></h2>
${chapters
  .map(
    ([chName, chLessons]) => `<h3 class="chapter">${escapeHtml(chName)}</h3>
<ul>${chLessons.map((l) => `<li><a href="/lessons/${encId(l.id)}/">${escapeHtml(l.title)}</a></li>`).join('')}</ul>`,
  )
  .join('')}`;
    })
    .join('\n');

  return (
    head({
      title: 'كل المسائل — يَسِّر',
      desc,
      url,
      jsonld,
      ogType: 'website',
      ogImage: ogImageFor(null),
    }) +
    `<div class="breadcrumb"><a href="/">الرئيسية</a> › كل المسائل</div>
<h1>كل المسائل</h1>
<p class="meta">${bookNames.length} كتب • ${lessonsData.length} مسألة</p>
<div class="hub">
${groupsHtml}
</div>` +
    foot(`/#/lessons`)
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

// ── صورة مشاركة لكل كتاب (1200×630) — تُولَّد بـ sharp داخل البناء ──
// بلا صورة، تُشارك الرسائل والمحرّكات بطاقةً بلا رسم؛ ومعنونة بالكتاب صارت كل صفحة مسألة
// تحمل صورة كتابها. تُعاد في كل بناء لأن عناوين الأبواب وعدد المسائل يتغيّران من الإدارة.
// الأبواب تُرسم بالنص SVG فلا نحتاج تحميل خطوط عربية (لا تبعية شبكة في البناء).
const BRAND_LOGO = join(root, 'src', 'assets', 'logo-circle.webp');
const OG_W = 1200;
const OG_H = 630;

async function writeBookOgImages(sharp) {
  if (!sharp) {
    console.warn('⚠️ SEO: sharp غير متاح — تخطّي صور المشاركة (تبقى og-image.jpg العامة).');
    return;
  }

  // الشعار في المنتصف الأيمن (RTL) والنص يشغل المساحة اليسرى
  const logoSize = 360;
  const logoLeft = OG_W - logoSize - 70;
  const logoTop = Math.round((OG_H - logoSize) / 2);
  // ⚠️ مع direction="rtl" يكون text-anchor="end" هو الحرف **الأخير** فيمتد النص يمينًا
  // خارج الصورة. الصحيح "start": يُثبَّت أول حرف عند الإحداثي ويمتد النص يسارًا.
  const textRight = logoLeft - 40;
  const textMaxWidth = textRight - 70;

  // عرض النص العربي مقيس فعليًا من sharp (لا يوجد قياس نصوص في SVG بلا خط مُحمَّل)
  const measure = async (text, size, family = 'Amiri, serif', weight = 700) => {
    const probe = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="240"><rect width="2400" height="240" fill="#000"/>` +
        `<text x="1200" y="170" text-anchor="start" direction="rtl" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="#fff">${escapeHtml(text)}</text></svg>`,
    );
    const { data: px, info: meta } = await sharp(probe).raw().toBuffer({ resolveWithObject: true });
    let minX = meta.width;
    for (let y = 0; y < meta.height; y += 1) {
      for (let x = 0; x < meta.width; x += 1) {
        if (px[(y * meta.width + x) * meta.channels] > 128 && x < minX) minX = x;
      }
    }
    return 1200 - minX;
  };
  // تصغير تدريجي حتى يدخل النص المساحة (بلا قطع ولا تراكب مع الشعار)
  const fit = async (text, size, family, weight) => {
    let s = size;
    while (s > 16 && (await measure(text, s, family, weight)) > textMaxWidth) s -= 4;
    return s;
  };

  let logo = null;
  if (existsSync(BRAND_LOGO)) {
    logo = await sharp(BRAND_LOGO).resize(logoSize, logoSize, { fit: 'contain' }).png().toBuffer();
  }

  for (const name of bookNames) {
    const lessons = byBook[name];
    const chapters = lessonChapters(lessons).length;
    const title = escapeHtml(name);
    const stats = `${chapters} أبواب • ${lessons.length} مسألة`;
    const brand = 'يَسِّر';
    const tagline = 'قراءة كاملة بدون تسجيل — fqh.me';
    // كل سطر يُقاس ويُصغَّر ليقع داخل textMaxWidth — فلا تراكب مع الشعار ولا قطع
    const [brandSize, titleSize, statsSize, tagSize] = await Promise.all([
      fit(brand, 34, 'Tajawal, Amiri, sans-serif', 400),
      fit(name, 66, 'Amiri, serif', 700),
      fit(stats, 32, 'Tajawal, sans-serif', 400),
      fit(tagline, 26, 'Tajawal, sans-serif', 400),
    ]);
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#101414"/>
      <stop offset="100%" stop-color="#16201f"/>
    </linearGradient>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#g)"/>
  <rect x="0" y="${OG_H - 10}" width="${OG_W}" height="10" fill="#5cc0b5"/>
  <g text-anchor="start" direction="rtl">
    <text x="${textRight}" y="150" font-family="Tajawal, Amiri, sans-serif" font-size="${brandSize}" fill="#5cc0b5">${brand}</text>
    <text x="${textRight}" y="262" font-family="Amiri, serif" font-size="${titleSize}" font-weight="700" fill="#e6e8e6">${title}</text>
    <text x="${textRight}" y="340" font-family="Tajawal, sans-serif" font-size="${statsSize}" fill="#a9b1ad">${stats}</text>
    <text x="${textRight}" y="414" font-family="Tajawal, sans-serif" font-size="${tagSize}" fill="#d8a06a">${tagline}</text>
  </g>
</svg>`,
    );

    const out = sharp(svg).composite(
      logo ? [{ input: logo, top: logoTop, left: logoLeft }] : [],
    );
    const ogDir = join(PUBLIC, 'og');
    mkdirSync(ogDir, { recursive: true });
    await out.jpeg({ quality: 82, mozjpeg: true }).toFile(join(ogDir, `${name}.jpg`));
  }
  console.log(`🖼️  SEO: صور مشاركة لـ ${bookNames.length} كتاب (${OG_W}×${OG_H})`);
}

// ── صورة المشاركة العامة للمنصة (1200×630 القياسية 1.91:1) ──
// تُولَّد دائمًا بهوية «يَسِّر» والشعار الجديد المعتمد
const OG_DEFAULT_PATH = join(PUBLIC, 'og-image.jpg');

async function writeDefaultOgImage(sharp) {
  const brand = 'يَسِّر';
  const title = 'منصة تعليم الفقه الإسلامي';
  const subtitle = 'عرض تفاعلي ميسّر لأبواب الفقه ومسائله';
  const tagline = 'قراءة كاملة بدون تسجيل — fqh.me';

  const logoSize = 360;
  const logoLeft = 70;
  const logoTop = Math.round((OG_H - logoSize) / 2);
  const textRight = OG_W - 70;

  let logo = null;
  if (existsSync(BRAND_LOGO)) {
    logo = await sharp(BRAND_LOGO).resize(logoSize, logoSize, { fit: 'contain' }).png().toBuffer();
  }

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#101414"/>
      <stop offset="100%" stop-color="#16201f"/>
    </linearGradient>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#bg)"/>
  <rect x="0" y="${OG_H - 10}" width="${OG_W}" height="10" fill="#5cc0b5"/>
  <g text-anchor="start" direction="rtl">
    <text x="${textRight}" y="170" font-family="Tajawal, Amiri, sans-serif" font-size="38" fill="#5cc0b5">${brand}</text>
    <text x="${textRight}" y="275" font-family="Amiri, serif" font-size="64" font-weight="700" fill="#e6e8e6">${title}</text>
    <text x="${textRight}" y="355" font-family="Tajawal, sans-serif" font-size="30" fill="#a9b1ad">${subtitle}</text>
    <text x="${textRight}" y="430" font-family="Tajawal, sans-serif" font-size="26" fill="#d8a06a">${tagline}</text>
  </g>
</svg>`,
  );

  const out = sharp(svg).composite(
    logo ? [{ input: logo, top: logoTop, left: logoLeft }] : [],
  );
  await out.jpeg({ quality: 86, mozjpeg: true }).toFile(OG_DEFAULT_PATH);
  console.log('🖼️  SEO: og-image.jpg العامة بهوية «يَسِّر» والشعار الجديد (1200×630)');
}

// ── تجهيز المجلدات والكتابة في مكانها دون إفراغ جذري مسبق (لتجنب سباق القراءة مع Vitest) ──
mkdirSync(join(PUBLIC, 'books'), { recursive: true });
mkdirSync(join(PUBLIC, 'lessons'), { recursive: true });

// ترتيب المسائل داخل كل كتاب كما يظهر في التصفح (باب ← معرّف) لتسلسل prev/next
const bookLessonsSorted = {};
for (const name of bookNames) {
  bookLessonsSorted[name] = [...byBook[name]].sort(
    (a, b) =>
      Number(a.id) - Number(b.id) || String(a.title).localeCompare(String(b.title), 'ar'),
  );
}

// تاريخ التعديل الحقيقي: أحدث طابع زمني في بيانات ذلك الكتاب (سحابة/نسخة احتياطية)
const timestampOf = (l) =>
  [l.updatedAt, l.updated_at, l.updatedOn, l.createdAt]
    .map((v) => (v ? new Date(v).getTime() : NaN))
    .find((t) => Number.isFinite(t)) ?? null;
const lastmodOf = (list) => {
  const t = list.map(timestampOf).filter(Boolean).sort((a, b) => b - a)[0];
  return t ? new Date(t).toISOString().slice(0, 10) : null;
};

let count = 0;
const bookLastmod = {};
for (const name of bookNames) {
  const lessons = byBook[name];
  // اسم المجلد = الاسم الحقيقي لا المُرمَّز: الخادم يفكّ ترميز المسار قبل البحث عن الملف،
  // فمجلد باسم %D9%83… كان لا يُطابَق أبدًا فتسقط صفحة الكتاب إلى الـ SPA (404 محتوى للزحّاف).
  const dir = join(PUBLIC, 'books', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), bookPage(name, lessons), 'utf8');
  bookLastmod[name] = lastmodOf(lessons);
  count += 1;
}

const lessonLastmod = {};
for (const l of lessonsData) {
  const bookName = (l.bookName || '').trim();
  const bookLessons = bookLessonsSorted[bookName] ?? [l];
  const dir = join(PUBLIC, 'lessons', String(l.id));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), lessonPage(l, bookLessons, bookName), 'utf8');
  lessonLastmod[String(l.id)] = timestampOf(l) ? new Date(timestampOf(l)).toISOString().slice(0, 10) : null;
  count += 1;
}

// ── صور المشاركة + استدعاء التوليد ──
try {
  const { default: sharp } = await import('sharp');
  await writeDefaultOgImage(sharp);
  await writeBookOgImages(sharp);
} catch (e) {
  console.warn('⚠️ SEO: تعذّر توليد صور المشاركة —', e?.message);
}

// ── صفحة فهرس المسائل (/lessons/) ──
writeFileSync(join(PUBLIC, 'lessons', 'index.html'), lessonsIndexPage(), 'utf8');
console.log(`🔗 SEO: صفحة فهرس كل المسائل (/lessons/) تربط ${lessonsData.length} مسألة`);

// ── تنظيف المجلدات اليتيمة (إن حُذفت مسألة أو كتاب) دون إفراغ الشجرة مسبقًا ──
try {
  const lessonsDir = join(PUBLIC, 'lessons');
  if (existsSync(lessonsDir)) {
    const validIds = new Set(lessonsData.map((l) => String(l.id)));
    for (const entry of readdirSync(lessonsDir)) {
      if (entry === 'index.html') continue;
      if (!validIds.has(entry)) {
        rmSync(join(lessonsDir, entry), { recursive: true, force: true });
      }
    }
  }
  const booksDir = join(PUBLIC, 'books');
  if (existsSync(booksDir)) {
    const validBooks = new Set(bookNames);
    for (const entry of readdirSync(booksDir)) {
      if (!validBooks.has(entry)) {
        rmSync(join(booksDir, entry), { recursive: true, force: true });
      }
    }
  }
} catch (e) {
  console.warn('⚠️ SEO: تنظيف المجلدات اليتيمة واجه مشكلة:', e?.message);
}

// ── sitemap شامل ──
const urlEntry = (loc, lastmod, extra = '') =>
  `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>weekly</changefreq>${extra}</url>`;
const urls = [
  urlEntry(`${BASE}/`, lastmodOf(lessonsData)),
  urlEntry(`${BASE}/lessons/`, lastmodOf(lessonsData)),
];
bookNames.forEach((n) => urls.push(urlEntry(`${BASE}/books/${enc(n)}/`, bookLastmod[n])));
lessonsData.forEach((l) =>
  urls.push(urlEntry(`${BASE}/lessons/${encId(l.id)}/`, lessonLastmod[String(l.id)])),
);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
writeFileSync(join(PUBLIC, 'sitemap.xml'), sitemap, 'utf8');

console.log(`✅ بريرندرينج: ${count} صفحة ثابتة (${bookNames.length} كتاب + ${lessonsData.length} مسألة) + فهرس + sitemap.xml`);
