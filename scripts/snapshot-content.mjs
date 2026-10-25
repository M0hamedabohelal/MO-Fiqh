// لقطة المحتوى المحلية من السحابة — يولّد src/data/lessons.ts من Firestore
// السبب: اللقطة المحلية هي أول ما يُعرض قبل وصول السحابة؛ إن تقادمت ظهرت كتب
// فارغة لحظيًا (أو مسائل محذوفة) حتى يصل المحتوى من السحابة.
// الاستخدام: npm run content:snapshot  (بعد أي تعديل إداري واسع، وقبل النشر)
// ملاحظة: القاموس المحلي لا يُمسّ — قد يحوي مصطلحات مقصودة غير منشورة سحابيًا.
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, renameSync, unlinkSync } from 'node:fs';
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

const targetPath = join(root, 'data', 'content', 'lessons.json');

// حماية من الكتابة الفارغة: سحابة فارغة/ناقصة تُفسد اللقطة المحلية الاحتياطية.
// نرفض الكتابة إن لم تُجلب أي مسألة، أو إن كان العدد أقل بوضوح من اللقطة الحالية (تقلّص غير متوقع).
if (lessons.length === 0) {
  console.error('❌ السحابة أعادت صفر مسائل — رُفضت الكتابة حفاظًا على اللقطة المحلية.');
  process.exit(1);
}
if (existsSync(targetPath)) {
  const currentMatch = readFileSync(targetPath, 'utf8').match(/"id"\s*:/g);
  const currentCount = currentMatch ? currentMatch.length : 0;
  if (currentCount > 0 && lessons.length < currentCount * 0.5) {
    console.error(`❌ السحابة أعادت ${lessons.length} مسألة فقط مقابل ${currentCount} محليًا (تقليص > 50%) — رُفضت الكتابة. راجع المحتوى السحابي.`);
    process.exit(1);
  }
}

const output = JSON.stringify(lessons, null, 2) + '\n';

mkdirSync(join(root, 'data', 'content'), { recursive: true });

// نسخة احتياطية مؤرخة من اللقطة الحالية قبل الكتابة فوقها (لا تُفقد عند تقليص غير متوقع)
if (existsSync(targetPath)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = join(root, 'backups', `lessons-local-${stamp}.json`);
  try {
    mkdirSync(join(root, 'backups'), { recursive: true });
    copyFileSync(targetPath, backupPath);
    console.log(`🗄️  نسخة احتياطية: backups/${backupPath.split(/[\\/]/).pop()}`);
  } catch (err) {
    console.error('❌ تعذّر إنشاء النسخة الاحتياطية — أُلغيت الكتابة:', err.message);
    process.exit(1);
  }
}

// كتابة ذرية: ملف مؤقت ثم استبدال — لو انقطعت العملية لا يُفسد الملف الأصلي
const tmpPath = `${targetPath}.tmp`;
try {
  writeFileSync(tmpPath, output, 'utf8');
  renameSync(tmpPath, targetPath);
} catch (err) {
  try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch { /* تجاهل */ }
  console.error('❌ فشلت الكتابة:', err.message);
  process.exit(1);
}

const byBook = {};
for (const l of lessons) {
  const b = String(l.bookName || '؟').trim();
  byBook[b] = (byBook[b] || 0) + 1;
}
console.log(`✅ كُتبت اللقطة المحلية: ${lessons.length} مسألة`);
console.log(JSON.stringify(byBook, null, 1));
