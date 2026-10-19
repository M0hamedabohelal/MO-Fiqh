// إنشاء حساب مشرف وإضافته لمجموعة الأدمن في Firestore — عبر Firebase Admin SDK.
// السبب: قواعد Firestore ترفض كتابة مجموعة admins من العميل (allow create: if false)،
// فالحساب يُنشأ ويُوسَم من الخادم بمفتاح حساب خدمة (يتجاوز القواعد).
//
// المتطلبات (مرة واحدة):
//   1) Firebase Console ← Project Settings ← Service accounts ← Generate new private key
//   2) احفظ الملف باسم scripts/service-account.json (مستثنى من git) — أو ضع مساره في
//      متغير البيئة GOOGLE_APPLICATION_CREDENTIALS.
//
// الاستخدام:
//   node scripts/create-admin.mjs "email@example.com" "كلمة_المرور"
// الأأمن لكلمة المرور: مرّرها عبر ADMIN_PASSWORD بدل سطر الأوامر
//   $env:ADMIN_PASSWORD="xxx"; node scripts/create-admin.mjs "email@example.com"
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadServiceAccount() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const defaultPath = join(__dirname, 'service-account.json');
  const keyPath = envPath && existsSync(envPath) ? envPath : defaultPath;
  if (!existsSync(keyPath)) {
    console.error('❌ لم يُعثر على مفتاح حساب الخدمة.');
    console.error('   نزّله من Firebase Console ← Project Settings ← Service accounts ← Generate new private key');
    console.error(`   واحفظه في: ${defaultPath}`);
    console.error('   أو ضع مساره في متغير البيئة GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(keyPath, 'utf8'));
  } catch (err) {
    console.error('❌ تعذّر قراءة مفتاح حساب الخدمة (JSON غير صالح؟):', err.message);
    process.exit(1);
  }
}

const email = process.argv[2];
const password = process.argv[3] || process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('❌ الاستخدام: node scripts/create-admin.mjs "الإيميل" "كلمة_المرور"');
  console.error('   أو: ADMIN_PASSWORD=xxx node scripts/create-admin.mjs "الإيميل"');
  process.exit(1);
}
if (password.length < 8) {
  console.error('❌ كلمة المرور يجب ألا تقل عن 8 حروف.');
  process.exit(1);
}

const serviceAccount = loadServiceAccount();

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
}
const auth = getAuth();
const db = getFirestore();

try {
  let uid;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password });
    console.log('ℹ️  المستخدم موجود مسبقًا — حُدّثت كلمة المرور.');
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    const cred = await auth.createUser({ email, password });
    uid = cred.uid;
    console.log('✅ أُنشئ مستخدم جديد.');
  }

  await db.collection('admins').doc(uid).set(
    { email, createdAt: new Date().toISOString() },
    { merge: true },
  );

  console.log('✅ تم تجهيز حساب المشرف بنجاح!');
  console.log('📧 الإيميل:', email);
  console.log('🆔 UID:', uid);
  process.exit(0);
} catch (err) {
  console.error('❌ فشل الإنشاء:', err.message);
  process.exit(1);
}
