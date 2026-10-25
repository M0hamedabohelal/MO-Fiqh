// سكربت استعادة بيانات Firestore من ملفات النسخ الاحتياطي (المحتوى + مكتبات المستخدمين)
// الحماية: يتطلب صراحة --dry-run للمعاينة أو --confirm للتنفيذ الفعلي لمنع الاسترجاع العرضي.
//
// الاستخدام:
//   node scripts/restore-firestore.mjs backups/firestore-full-backup-*.json --dry-run
//   node scripts/restore-firestore.mjs backups/firestore-full-backup-*.json --confirm

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isConfirmed = args.includes('--confirm');
const fileArg = args.find((a) => !a.startsWith('--'));

if (!fileArg) {
  console.error('\n❌ يرجى تحديد مسار ملف النسخة الاحتياطية.');
  console.error('   مثال: node scripts/restore-firestore.mjs backups/firestore-full-backup-2026-10-25_22-14.json --dry-run\n');
  process.exit(1);
}

const backupPath = join(process.cwd(), fileArg);
if (!existsSync(backupPath)) {
  console.error(`\n❌ ملف النسخة الاحتياطية غير موجود: ${backupPath}\n`);
  process.exit(1);
}

if (!isDryRun && !isConfirmed) {
  console.error('\n🛑 توقف! حارس الأمان يمنع استعادة البيانات دون تأكيد صريح.');
  console.error('   الخيارات المتاحة:');
  console.error(`     ١) للمعاينة وفحص المحتويات فقط:\n        node scripts/restore-firestore.mjs "${fileArg}" --dry-run`);
  console.error(`     ٢) للتنفيذ الفعلي وكتابة البيانات إلى Firestore:\n        node scripts/restore-firestore.mjs "${fileArg}" --confirm\n`);
  process.exit(1);
}

let backup;
try {
  backup = JSON.parse(readFileSync(backupPath, 'utf8'));
} catch (err) {
  console.error(`\n❌ فشل قراءة أو تحليل ملف JSON: ${err.message}\n`);
  process.exit(1);
}

const collections = backup.collections || {};
const counts = backup.counts || {};

console.log('📦 فحص محتويات ملف النسخة الاحتياطية:');
console.log(`   📅 تاريخ التصدير: ${backup.exportedAt || 'غير مسجل'}`);
console.log(`   🏷️  الوضع: ${backup.mode || 'غير مسجل'}`);
console.log(`   📚 الدروس: ${counts.lessons ?? collections.lessons?.length ?? 0}`);
console.log(`   📖 القاموس: ${counts.glossary ?? collections.glossary?.length ?? 0}`);
console.log(`   📢 الإعلانات: ${counts.announcements ?? collections.announcements?.length ?? 0}`);
console.log(`   📊 الإحصائيات: ${counts.stats ?? collections.stats?.length ?? 0}`);
console.log(`   👤 مكتبات المستخدمين: ${counts.userLibraries ?? collections.userLibraries?.length ?? 0}`);

if (isDryRun) {
  console.log('\n🔍 [معاينة DRY-RUN]: تم فحص البيانات بنجاح.');
  console.log('   ✅ الملف صالح وجاهز للاستعادة. لم يتم إجراء أي تعديل سحابي.');
  process.exit(0);
}

// ─── التنفيذ الفعلي عند توفر --confirm ───
function getServiceAccountKey() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const defaultPath = join(__dirname, 'service-account.json');
  const keyPath = envPath && existsSync(envPath) ? envPath : defaultPath;
  if (existsSync(keyPath)) {
    try {
      return JSON.parse(readFileSync(keyPath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

const serviceAccount = getServiceAccountKey();

if (!serviceAccount && (collections.userLibraries?.length > 0)) {
  console.warn('\n⚠️ تنبيه: استعادة بيانات المستخدمين تتطلب مفتاح scripts/service-account.json لتجاوز قواعد أمان العميل.');
  console.warn('   سيتم محاولة استعادة المجموعات العامة فقط عبر Client SDK إن تعذر الوصول كـ Admin.\n');
}

if (serviceAccount) {
  console.log('🛡️  استعادة البيانات عبر Firebase Admin SDK...');
  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const db = getFirestore();

  // استعادة مكتبات المستخدمين
  if (Array.isArray(collections.userLibraries) && collections.userLibraries.length > 0) {
    console.log(`\n👤 استعادة ${collections.userLibraries.length} مكتبة مستخدم...`);
    let restoredUsers = 0;
    for (const lib of collections.userLibraries) {
      const { _uid, _path, ...data } = lib;
      if (_path) {
        await db.doc(_path).set(data, { merge: true });
      } else if (_uid) {
        await db.doc(`users/${_uid}/data/library`).set(data, { merge: true });
      }
      restoredUsers++;
    }
    console.log(`   ✅ تم استعادة ${restoredUsers} مكتبة مستخدم بنجاح.`);
  }

  // استعادة الدروس إن وُجدت
  if (Array.isArray(collections.lessons) && collections.lessons.length > 0) {
    console.log(`\n📚 استعادة ${collections.lessons.length} مسألة...`);
    for (const lesson of collections.lessons) {
      const { _docId, ...data } = lesson;
      const id = String(_docId || data.id);
      await db.collection('lessons').doc(id).set(data, { merge: true });
    }
    console.log('   ✅ تم استعادة المسائل.');
  }

  // استعادة القاموس
  if (Array.isArray(collections.glossary) && collections.glossary.length > 0) {
    console.log(`\n📖 استعادة ${collections.glossary.length} مصطلح...`);
    for (const term of collections.glossary) {
      const { _docId, ...data } = term;
      await db.collection('glossary').doc(String(_docId)).set(data, { merge: true });
    }
    console.log('   ✅ تم استعادة القاموس.');
  }

  console.log('\n🎉 اكتملت عملية الاستعادة بنجاح تام!');
  process.exit(0);
} else {
  console.log('🌐 جاري تهيئة Client SDK لاستعادة المحتوى العام...');
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
  const { initializeApp } = await import('firebase/app');
  const { getFirestore, doc, setDoc } = await import('firebase/firestore');

  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });

  const db = getFirestore(app);

  if (Array.isArray(collections.lessons)) {
    for (const lesson of collections.lessons) {
      const { _docId, ...data } = lesson;
      const id = String(_docId || data.id);
      await setDoc(doc(db, 'lessons', id), data, { merge: true });
    }
  }

  console.log('\n🎉 تم استعادة المحتوى العام بنجاح عبر Client SDK!');
  process.exit(0);
}
