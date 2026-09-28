/**
 * رفع ملف PDF إلى Firebase Storage والحصول على رابطه المباشر
 * استخدام: node scripts/upload-pdf.mjs
 */
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function uploadPDF() {
  const pdfPath = join(__dirname, '../public/fiqh-book.pdf');
  const fileBuffer = readFileSync(pdfPath);

  console.log('📤 جارٍ رفع الملف إلى Firebase Storage...');
  const storageRef = ref(storage, 'public/fiqh-book.pdf');

  await uploadBytes(storageRef, fileBuffer, { contentType: 'application/pdf' });
  const downloadURL = await getDownloadURL(storageRef);

  console.log('✅ تم الرفع بنجاح!');
  console.log('📎 رابط التحميل المباشر:');
  console.log(downloadURL);
  console.log('\n⚡ انسخ هذا الرابط وضعه في HeroSection.jsx بدلاً من /fiqh-book.pdf');
}

uploadPDF().catch(console.error);
