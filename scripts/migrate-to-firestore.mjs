// سكريبت ترحيل لمرة واحدة — يرفع المسائل والقاموس من الملفات المحلية إلى Firestore
// الاستخدام: node scripts/migrate-to-firestore.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { lessonsData } from '../src/data/lessons.js';
import { glossaryData } from '../src/data/glossary.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// قراءة متغيرات البيئة من .env.local يدوياً (بدون مكتبات إضافية)
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    env[key] = value;
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

async function migrate() {
  console.log(`📚 رفع ${lessonsData.length} مسألة...`);
  let count = 0;
  for (const lesson of lessonsData) {
    await setDoc(doc(db, 'lessons', String(lesson.id)), lesson);
    count += 1;
    console.log(`   ✅ [${count}/${lessonsData.length}] ${lesson.title}`);
  }

  const terms = Object.keys(glossaryData);
  console.log(`📖 رفع ${terms.length} مصطلح فقهي...`);
  let termCount = 0;
  for (const [term, definition] of Object.entries(glossaryData)) {
    await setDoc(doc(db, 'glossary', term), { definition });
    termCount += 1;
    console.log(`   ✅ [${termCount}/${terms.length}] ${term}`);
  }

  console.log(`\n🎉 تم الترحيل بنجاح! (${count} مسألة + ${termCount} مصطلح)`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ فشل الترحيل:', err.message);
  process.exit(1);
});
