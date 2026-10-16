// مزامنة اللقطة المحلية من السحابة — يولّد src/data/lessons.ts من Firestore
// السبب: اللقطة المحلية هي أول ما يُعرض قبل وصول السحابة؛ إن تقادمت ظهرت كتب
// فارغة لحظيًا (أو مسائل محذوفة) حتى تكتمل المزامنة.
// الاستخدام: npm run sync:local  (بعد أي تعديل إداري واسع، وقبل النشر)
// ملاحظة: القاموس المحلي لا يُمسّ — قد يحوي مصطلحات مقصودة غير منشورة سحابيًا.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

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

const env = loadEnvLocal();
if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID || !env.VITE_FIREBASE_APP_ID) {
  console.error('❌ مفاتيح Firebase ناقصة في .env.local — لا يمكن القراءة الحية.');
  process.exit(1);
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

// تنظيف وتحقق صارم: أي مستند فاسد يوقف التوليد بدل كتابة ملف مكسور
const lessons = [];
const bad = [];
for (const d of snap.docs) {
  const { _docId, ...rest } = { _docId: d.id, ...d.data() };
  if (rest.id == null || !String(rest.title || '').trim() || typeof rest.mainText !== 'string') {
    bad.push(d.id);
    continue;
  }
  lessons.push(rest);
}
if (bad.length > 0) {
  console.error(`❌ ${bad.length} مستندات فاسدة (بلا id/عنوان/mainText): ${bad.slice(0, 5).join(', ')} — أصلحها من لوحة الإدارة أولًا.`);
  process.exit(1);
}
lessons.sort((a, b) => Number(a.id) - Number(b.id));

const header = `// نسخة محلية احتياطية من المحتوى — مولّدة من السحابة عبر \`npm run sync:local\`
// لا تحرر يدويًا: أي تعديل يدوي سيُكتب فوقه عند التوليد التالي.
// لتعديل المحتوى استخدم لوحة الإدارة ثم أعد التوليد قبل النشر.
import type { Lesson } from '../types';

export const lessonsData: Lesson[] = `;
mkdirSync(join(root, 'src', 'data'), { recursive: true });
writeFileSync(
  join(root, 'src', 'data', 'lessons.ts'),
  header + JSON.stringify(lessons, null, 2) + '\n',
  'utf8',
);

const byBook = {};
for (const l of lessons) {
  const b = String(l.bookName || '؟').trim();
  byBook[b] = (byBook[b] || 0) + 1;
}
console.log(`✅ كُتبت اللقطة المحلية: ${lessons.length} مسألة`);
console.log(JSON.stringify(byBook, null, 1));
