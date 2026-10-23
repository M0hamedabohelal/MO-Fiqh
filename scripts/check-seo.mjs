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
show('hub', 'public/lessons/index.html');

// فحص شامل: كل صفحة ثابتة لها صورة معاينة بأبعاد معلنة و canonical وزرّ يقود للتطبيق
let pages = 0;
const problems = [];
const walk = (dir) => {
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
      // صفحات قديمة تُخدَم من Service Worker سابق: لا بد من سكربت التنظيف في كل صفحة
      if (!h.includes('sw-cleared')) problems.push(`${p}: بلا سكربت إزالة Service Worker القديم`);
      // canonical/og:url لا يجوز أن يشير إلى نطاق يحوِّل (www → apex بـ 301)
      if (/https:\/\/www\.fqh\.me/.test(h)) problems.push(`${p}: رابط مطلق على www المحوِّل`);
    }
  }
};
walk('public/lessons');
walk('public/books');

console.log(`\nصفحات ثابتة: ${pages} | مشاكل: ${problems.length}`);
problems.slice(0, 10).forEach((p) => console.log('  ✗', p));
// فشل صريح في CI بدل تقرير يُقرأ بالعين فقط — الصفحات الثابتة هي مدخل محركات البحث
// وأي كسر صامت فيها (زر يقود لنفسه، صورة معاينة غائبة) لا يظهر في اختبارات التطبيق.
if (problems.length > 0) process.exitCode = 1;
