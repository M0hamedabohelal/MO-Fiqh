// تشخيص المحتوى الحقيقي من Firestore: عدد المسائل + المصطلحات + المطابقة الفعلية
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
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
const db = getFirestore(app);

function norm(s) {
  return String(s || '').normalize('NFKC')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
}

const lessonsSnap = await getDocs(collection(db, 'lessons'));
const lessons = lessonsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const glosSnap = await getDocs(collection(db, 'glossary'));
const glossary = {};
glosSnap.forEach((d) => (glossary[d.id] = d.data().definition));
const glossary2 = {};
glosSnap.forEach((d) => (glossary2[d.id] = d.data()));

// دمج القاموس المحلي (الموجود في الكود) مع السحابي = ما يراه المستخدم فعلاً
const { glossaryData } = await import('../src/data/glossary.js');
const mergedGlossary = { ...glossaryData, ...glossary }; // المحلي أولًا ثم السحابي يغطّي

// توزيع المسائل حسب الكتاب
const byBook = {};
lessons.forEach((l) => {
  const b = (l.bookName || '—').trim();
  byBook[b] = (byBook[b] || 0) + 1;
});

console.log('=== إحصائيات المحتوى الحقيقي (Firestore) ===');
console.log('📚 مجموع المسائل:', lessons.length);
console.log('📖 توزيع الكتب:', JSON.stringify(byBook, null, 0));
console.log('📖 عدد مصطلحات القاموس:', glosSnap.size);
console.log('   متغير definition موجود؟', glosSnap.docs.some((d) => typeof d.data().definition === 'string' ? 'نعم' : 'لا'));

// المطابقة الفعلية عبر كل المتن والشرح
const mainAll = lessons.map((l) => ' ' + norm(l.mainText || '') + ' ').join(' ');
const explAll = lessons.map((l) => ' ' + norm(l.sheikhExplanation || '') + ' ').join(' ');

let matched = 0;
const matchedTerms = [];
const missingTerms = [];
for (const [t, d] of Object.entries(mergedGlossary)) {
  const n = norm(t);
  if (!n) continue;
  if (mainAll.includes(n) || explAll.includes(n) || lessons.some((l) => norm(l.title || '').includes(n) || norm(l.chapterName || '').includes(n))) {
    matched += 1;
    matchedTerms.push(t);
  } else {
    missingTerms.push(t);
  }
}
console.log('\n=== المطابقة (القاموس الكامل المدمج = المحلي + السحابي) ===');
console.log('(إجمالي المصطلحات المدمجة:', Object.keys(mergedGlossary).length, ')');
console.log('✅ مصطلحات كلمتهم موجودة في النصوص الحقيقية (تظهر):', matched);
console.log('❌ مصطلحات كلمتهم غير موجودة (لن تظهر):', missingTerms.length);
console.log('\n🟢 المتطابقة:', matchedTerms.join('، '));
console.log('\n🔴 غير المطابقة:', missingTerms.join('، '));
