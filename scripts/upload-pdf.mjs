// رفع ملف PDF إلى Firebase Storage والحصول على رابطه المباشر — عبر Firebase Admin SDK.
// السبب: قواعد Storage ترفض كل كتابة من العميل (allow write: if false)، فالرفع يتم
// من الخادم بمفتاح حساب خدمة (يتجاوز القواعد).
//
// المتطلبات (مرة واحدة): نفس create-admin.mjs — مفتاح حساب خدمة في
// scripts/service-account.json أو مسار في GOOGLE_APPLICATION_CREDENTIALS.
//
// الاستخدام: node scripts/upload-pdf.mjs [مسار_الملف]
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadServiceAccount() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const defaultPath = join(__dirname, 'service-account.json');
  const keyPath = envPath && existsSync(envPath) ? envPath : defaultPath;
  if (!existsSync(keyPath)) {
    console.error('❌ لم يُعثر على مفتاح حساب الخدمة.');
    console.error(`   احفظه في: ${defaultPath}`);
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

const serviceAccount = loadServiceAccount();
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
    storageBucket: `${serviceAccount.project_id}.appspot.com`,
  });
}

async function uploadPDF() {
  const pdfPath = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, 'public', 'fiqh-book.pdf');
  if (!existsSync(pdfPath)) {
    console.error('❌ ملف PDF غير موجود:', pdfPath);
    process.exit(1);
  }

  const fileBuffer = readFileSync(pdfPath);
  console.log('📤 جارٍ رفع الملف إلى Firebase Storage...');

  const bucket = getStorage().bucket();
  const destination = 'public/fiqh-book.pdf';
  const file = bucket.file(destination);
  await file.save(fileBuffer, {
    contentType: 'application/pdf',
    public: true,
    metadata: { cacheControl: 'public, max-age=86400' },
  });

  const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media`;

  console.log('✅ تم الرفع بنجاح!');
  console.log('📎 رابط التحميل المباشر:');
  console.log(downloadURL);
  console.log('\n⚡ ضع هذا الرابط في HeroSection.tsx بدلًا من /fiqh-book.pdf');
}

uploadPDF().catch((err) => {
  console.error('❌ فشل الرفع:', err.message);
  process.exit(1);
});
