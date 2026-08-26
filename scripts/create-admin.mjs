// إنشاء حساب مشرف وإضافته لمجموعة الأدمن في Firestore
// الاستخدام: node scripts/create-admin.mjs "email@example.com" "كلمة_المرور"
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
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

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ الاستخدام: node scripts/create-admin.mjs "الإيميل" "كلمة_المرور"');
  process.exit(1);
}
if (password.length < 6) {
  console.error('❌ كلمة المرور يجب ألا تقل عن 6 حروف');
  process.exit(1);
}

const env = loadEnv();
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

try {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'admins', cred.user.uid), {
    email,
    createdAt: new Date().toISOString(),
  });
  console.log('✅ تم إنشاء حساب المشرف بنجاح!');
  console.log('📧 الإيميل:', email);
  console.log('🆔 UID:', cred.user.uid);
  process.exit(0);
} catch (err) {
  console.error('❌ فشل الإنشاء:', err.message);
  process.exit(1);
}
