// نسخة احتياطية للمحتوى — يُصدّر الدروس والقاموس والإعلانات من Firestore إلى ملف JSON مؤرخ
// كل السكربتات السابقة "رفع" فقط؛ هذا السكربت هو اتجاه "التنزيل" للحماية من الحذف الخاطئ
// الاستخدام: npm run backup  (يُحفظ في backups/ وهو مجلد متجاهَل من git)
// الاستعادة اليدوية عند الحاجة: راجع الملف ثم ارفع عبر scripts/migrate-to-firestore.mjs
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// قراءة متغيرات البيئة من .env.local يدوياً (بدون مكتبات إضافية) — نفس نهج سكربت الترحيل
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

console.log('🚀 جاري الاتصال بـ Firebase (قراءة فقط)...');
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function dumpCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((d) => ({ _docId: d.id, ...d.data() }));
}

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;

const lessons = await dumpCollection('lessons');
console.log(`   📚 الدروس: ${lessons.length}`);
const glossaryDocs = await dumpCollection('glossary');
console.log(`   📖 القاموس: ${glossaryDocs.length}`);
const announcements = await dumpCollection('announcements');
console.log(`   📢 الإعلانات: ${announcements.length}`);

const payload = {
  exportedAt: now.toISOString(),
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  counts: { lessons: lessons.length, glossary: glossaryDocs.length, announcements: announcements.length },
  collections: { lessons, glossary: glossaryDocs, announcements },
};

const backupsDir = join(__dirname, '..', 'backups');
mkdirSync(backupsDir, { recursive: true });
const outPath = join(backupsDir, `firestore-backup-${stamp}.json`);
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

console.log(`\n🎉 تم حفظ النسخة الاحتياطية: ${outPath}`);
process.exit(0);
