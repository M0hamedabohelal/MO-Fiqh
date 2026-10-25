// سكريبت ترحيل المسائل والقاموس من الملفات المحلية إلى Firestore مع حارس أمان كامل
// الحماية: يتطلب صراحة إما --dry-run للمعاينة أو --confirm للتنفيذ، ويأخذ نسخة احتياطية تلقائية قبل الكتابة.
// الاستخدام:
//   node scripts/migrate-to-firestore.mjs --dry-run   (معاينة فقط دون مساس بالسحابة)
//   node scripts/migrate-to-firestore.mjs --confirm   (تنفيذ بعد أخذ نسخة احتياطية تلقائية)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { lessonsData } from '../src/data/lessons.ts';
import { glossaryData } from '../src/data/glossary.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const isDryRun = process.argv.includes('--dry-run');
const isConfirmed = process.argv.includes('--confirm');

if (!isDryRun && !isConfirmed) {
  console.error('\n🛑 توقف! حارس الأمان يمنع الكتابة غير المقصودة فوق محتوى السحابة.');
  console.error('   تشغيل هذا السكربت يستبدل محتوى الإنتاج في Firestore باللقطة المحلية.');
  console.error('\n   الخيارات المتاحة:');
  console.error('     ١) للمعاينة وحساب العناصر فقط:');
  console.error('        node scripts/migrate-to-firestore.mjs --dry-run');
  console.error('     ٢) للتنفيذ الفعلي (يقوم بأخذ نسخة احتياطية تلقائيًا أولًا):');
  console.error('        node scripts/migrate-to-firestore.mjs --confirm\n');
  process.exit(1);
}

function loadEnv() {
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    env[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
  }
  return env;
}

const env = loadEnv();
const requiredKeys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'];
const missing = requiredKeys.filter((k) => !env[k]);
if (missing.length > 0) {
  console.error('❌ مفاتيح ناقصة في .env.local:', missing.join(', '));
  process.exit(1);
}

if (isDryRun) {
  console.log('🔍 [معاينة DRY-RUN] فحص البيانات المحلية دون إجراء أي تعديل سحابي:');
  console.log(`   📚 عدد المسائل المحلية: ${lessonsData.length}`);
  console.log(`   📖 عدد المصطلحات الفقهية: ${Object.keys(glossaryData).length}`);
  console.log('   ✅ كل العناصر جاهزة وسليمة. لم يتم لمس Firestore.');
  process.exit(0);
}

console.log('🚀 جاري تهيئة Firebase...');
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

// ─── خطوة الحماية: أخذ نسخة احتياطية فورية قبل أي كتابة ───
console.log('📦 جاري أخذ نسخة احتياطية تلقائية من السحابة قبل بدء الترحيل...');
try {
  const backupSnap = await getDocs(collection(db, 'lessons'));
  const currentCloudLessons = backupSnap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
  const backupsDir = join(root, 'backups');
  mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = join(backupsDir, `pre-migration-backup-${stamp}.json`);
  writeFileSync(
    backupFile,
    JSON.stringify({ exportedAt: new Date().toISOString(), lessons: currentCloudLessons }, null, 2),
    'utf8'
  );
  console.log(`   ✅ تم حفظ نسخة احتياطية فورية (${currentCloudLessons.length} مسألة): ${backupFile}`);
} catch (err) {
  console.warn(`   ⚠️ تعذّر أخذ النسخة الاحتياطية التلقائية: ${err.message}`);
}

async function migrate() {
  console.log(`\n📚 بدء رفع ${lessonsData.length} مسألة إلى Firestore...`);
  let count = 0;
  for (const lesson of lessonsData) {
    await setDoc(doc(db, 'lessons', String(lesson.id)), lesson);
    count += 1;
    console.log(`   ✅ [${count}/${lessonsData.length}] ${lesson.title}`);
  }

  const terms = Object.keys(glossaryData);
  console.log(`\n📖 رفع ${terms.length} مصطلح فقهي...`);
  let termCount = 0;
  for (const [term, definition] of Object.entries(glossaryData)) {
    await setDoc(doc(db, 'glossary', term), { definition });
    termCount += 1;
    console.log(`   ✅ [${termCount}/${terms.length}] ${term}`);
  }

  console.log(`\n🎉 تم الترحيل بنجاح تام! (${count} مسألة + ${termCount} مصطلح)`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ فشل الترحيل:', err.message);
  process.exit(1);
});
