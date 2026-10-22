#!/usr/bin/env node
// فحص صارم لتقادم لقطة المحتوى المضمّنة (src/data/lessons.ts) مقابل Firestore الحقيقي.
// الاستخدام:
//   npm run check:content            # تحذير وخروج 0
//   npm run check:content -- --strict # خروج 1 عند أي انحراف (مناسب لـ CI مع مفاتيح)
// بلا مفاتيح (.env.local) أو بلا شبكة: يتخطى بصوت عالٍ بدل إفشال غير مبرَّر.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');

function loadEnv() {
  const file = join(root, '.env.local');
  if (!existsSync(file)) return {};
  const env = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const apiKey = env.VITE_FIREBASE_API_KEY;
const projectId = env.VITE_FIREBASE_PROJECT_ID;

const { lessonsData: bundled } = await import('../src/data/lessons.ts');
const bundledCount = (bundled || []).length;

if (!apiKey || !projectId) {
  console.log(`ℹ️  تخطي فحص المحتوى: لا مفاتيح Firebase في .env.local (اللقطة: ${bundledCount} مسألة).`);
  process.exit(0);
}

async function fetchLiveIds() {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/lessons`;
  const ids = [];
  let page = null;
  do {
    const url = `${base}?pageSize=300&key=${apiKey}${page ? `&pageToken=${page}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const json = await res.json();
    for (const doc of json.documents || []) {
      ids.push(String(doc.fields?.id?.integerValue ?? doc.fields?.id?.stringValue ?? doc.name.split('/').pop()));
    }
    page = json.nextPageToken;
  } while (page);
  return ids;
}

let liveIds;
try {
  liveIds = await fetchLiveIds();
} catch (err) {
  console.log(`ℹ️  تخطي فحص المحتوى: تعذّر الوصول إلى Firestore (${err.message}).`);
  process.exit(0);
}

const bundledIds = new Set((bundled || []).map((l) => String(l.id)));
const missing = liveIds.filter((id) => !bundledIds.has(id));
const extra = [...bundledIds].filter((id) => !liveIds.includes(id));

console.log(`لقطة البناء: ${bundledCount} مسألة · السحابة: ${liveIds.length} مسألة`);

if (missing.length === 0 && extra.length === 0) {
  console.log('✅ اللقطة مطابقة للسحابة.');
  process.exit(0);
}

if (missing.length) console.log(`   ناقصة في اللقطة (${missing.length}): ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ' …' : ''}`);
if (extra.length) console.log(`   موجودة في اللقطة فقط (${extra.length}): ${extra.slice(0, 12).join(', ')}${extra.length > 12 ? ' …' : ''}`);

if (strict) {
  console.error('❌ فحص صارم: اللقطة متقادمة — شغّل `npm run content:snapshot` ثم أعد المحاولة.');
  process.exit(1);
}

console.log('⚠️  اللقطة متقادمة (غير مُوقف). المستخدم لا يتأثر: المحتوى يأتي من السحابة أو الكاش،');
console.log('   والحالة الفارغة صريحة. التحديث يخص مقارنة لوحة الإدارة وصفحات SEO الاحتياطية.');
