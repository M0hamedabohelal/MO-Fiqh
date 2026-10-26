// نسخة احتياطية شاملة لبيانات Firestore (المحتوى + بيانات المستخدمين + الإحصائيات + السجلات)
// تدعم وضعي التشغيل:
// ١) وضع المشرف الكامل (Admin SDK): إذا وُجد scripts/service-account.json — ينسخ كافة بيانات المستخدمين (المكتبات، شواهد الحذف، علامات الوقف، الملاحظات) دون قيود القواعد.
// ٢) وضع العميل (Client SDK): ينسخ المحتوى العام وقواعد البيانات المفتوحة للقراءة مع تنبيه شفاف.
//
// الاستخدام: npm run backup

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { applyRetentionPolicy } from './backup-retention.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const backupsDir = join(root, 'backups');
mkdirSync(backupsDir, { recursive: true });

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;

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

function getServiceAccountKey() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (raw.startsWith('{')) {
        return JSON.parse(raw);
      }
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch (e) {
      console.warn('⚠️ تعذر تحليل FIREBASE_SERVICE_ACCOUNT من متغيرات البيئة:', e.message);
    }
  }
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

if (serviceAccount) {
  // ─── الوضع المتميز الكامل (Admin SDK) ───
  console.log('🛡️  تشغيل النسخ الاحتياطي عبر Firebase Admin SDK (يشمل بيانات المستخدمين الكاملة)...');
  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const db = getFirestore();

  async function dumpAdminCollection(name) {
    const snap = await db.collection(name).get();
    return snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
  }

  // ١. المحتوى العام
  const lessons = await dumpAdminCollection('lessons');
  console.log(`   📚 الدروس والمسائل: ${lessons.length}`);
  const glossary = await dumpAdminCollection('glossary');
  console.log(`   📖 القاموس الفقهي: ${glossary.length}`);
  const announcements = await dumpAdminCollection('announcements');
  console.log(`   📢 الإعلانات: ${announcements.length}`);

  // ٢. إحصائيات وسجلات الأخطاء
  const stats = await dumpAdminCollection('stats');
  console.log(`   📊 الإحصائيات (stats): ${stats.length}`);
  const clientErrors = await dumpAdminCollection('client_errors');
  console.log(`   ⚠️ سجلات الأخطاء (client_errors): ${clientErrors.length}`);

  // ٣. سجلات تعديل المسائل والإصدارات السابقة
  const revisionsSnap = await db.collection('lessonRevisions').get();
  const revisions = [];
  for (const doc of revisionsSnap.docs) {
    const versionsSnap = await doc.ref.collection('versions').get();
    const versions = versionsSnap.docs.map((v) => ({ _versionId: v.id, ...v.data() }));
    revisions.push({ _docId: doc.id, versions });
  }
  console.log(`   🕒 سجل مراجعات المسائل: ${revisions.length}`);

  // ٤. بيانات المستخدمين الحساسة (المكتبات، شواهد الحذف، المقروء)
  console.log('   👤 جلب بيانات مكتبات المستخدمين (collectionGroup: library)...');
  const librariesSnap = await db.collectionGroup('library').get();
  const userLibraries = librariesSnap.docs.map((d) => {
    // المسار: users/{uid}/data/library
    const pathParts = d.ref.path.split('/');
    const uid = pathParts[1] || d.ref.parent?.parent?.id || 'unknown';
    return {
      _uid: uid,
      _path: d.ref.path,
      ...d.data(),
    };
  });
  console.log(`   🔖 مكتبات المستخدمين المحفوظة: ${userLibraries.length}`);

  const readsSnap = await db.collectionGroup('announcementReads').get();
  const userReads = readsSnap.docs.map((d) => {
    const pathParts = d.ref.path.split('/');
    const uid = pathParts[1] || 'unknown';
    return {
      _uid: uid,
      _path: d.ref.path,
      ...d.data(),
    };
  });
  console.log(`   👁️ مقروء إعلانات المستخدمين: ${userReads.length}`);

  const payload = {
    exportedAt: now.toISOString(),
    projectId: serviceAccount.project_id,
    mode: 'admin_full',
    counts: {
      lessons: lessons.length,
      glossary: glossary.length,
      announcements: announcements.length,
      stats: stats.length,
      clientErrors: clientErrors.length,
      revisions: revisions.length,
      userLibraries: userLibraries.length,
      userAnnouncementReads: userReads.length,
    },
    collections: {
      lessons,
      glossary,
      announcements,
      stats,
      clientErrors,
      lessonRevisions: revisions,
      userLibraries,
      userAnnouncementReads: userReads,
    },
  };

  const outPath = join(backupsDir, `firestore-full-backup-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\n🎉 تم حفظ النسخة الاحتياطية الشاملة الكاملة: ${outPath}`);
  applyRetentionPolicy(backupsDir);
  process.exit(0);

} else {
  // ─── وضع العميل (Client SDK) ───
  console.log('🌐 تشغيل النسخ الاحتياطي عبر Client SDK (قراءة عامة)...');
  const env = loadEnv();
  const requiredKeys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'];
  const missing = requiredKeys.filter((k) => !env[k]);
  if (missing.length > 0) {
    console.error('❌ مفاتيح ناقصة في .env.local:', missing.join(', '));
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

  const db = getFirestore(app);

  async function dumpCollection(name) {
    try {
      const snapshot = await getDocs(collection(db, name));
      return snapshot.docs.map((d) => ({ _docId: d.id, ...d.data() }));
    } catch (err) {
      console.warn(`   ⚠️ تعذّر نسخ المجموعة ${name}: ${err.message}`);
      return [];
    }
  }

  const lessons = await dumpCollection('lessons');
  console.log(`   📚 الدروس: ${lessons.length}`);
  const glossaryDocs = await dumpCollection('glossary');
  console.log(`   📖 القاموس: ${glossaryDocs.length}`);
  const announcements = await dumpCollection('announcements');
  console.log(`   📢 الإعلانات: ${announcements.length}`);
  const stats = await dumpCollection('stats');
  console.log(`   📊 الإحصائيات (stats): ${stats.length}`);

  const payload = {
    exportedAt: now.toISOString(),
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    mode: 'client_public_only',
    counts: {
      lessons: lessons.length,
      glossary: glossaryDocs.length,
      announcements: announcements.length,
      stats: stats.length,
      userLibraries: 0,
    },
    collections: {
      lessons,
      glossary: glossaryDocs,
      announcements,
      stats,
    },
  };

  const outPath = join(backupsDir, `firestore-public-backup-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`\n🎉 تم حفظ النسخة الاحتياطية للمحتوى العام: ${outPath}`);
  console.log('💡 ملاحظة هامة: بيانات المستخدمين الشخصية (users/{uid}/data/library) محمية بقواعد أمان Firestore.');
  console.log('   لشمول بيانات كل المستخدمين وسجلات الأخطاء، وفّر مفتاح scripts/service-account.json لتفعيل النسخ الشامل.');
  applyRetentionPolicy(backupsDir);
  process.exit(0);
}
