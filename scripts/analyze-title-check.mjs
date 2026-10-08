// فحص: المصطلحات اللي بتظهر كعناوين فرعية (قبل النقطتين) في المحتوى الحقيقي من Firestore
// نفس منطق renderParagraph في QuoteCard: الفقرة اللي فيها ":" مبكر (<80) → titlePart
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { glossaryData } from '../src/data/glossary.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  const content = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
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
const lessons = lessonsSnap.docs.map((d) => d.data());

const terms = ['الصلوات المكتوبة', 'النية', 'الوضوء', 'الصلاة', 'الاستحاضة'];
const results = [];
let titleOccurrences = 0;

for (const l of lessons) {
  const text = l.mainText || '';
  for (const [pi, paragraphRaw] of text.split('\n').entries()) {
    const paragraph = (paragraphRaw || '').trim();
    if (!paragraph) continue;
    const colonIndex = paragraph.indexOf(':');
    let titlePart = '';
    let bodyPart = paragraph;
    if (colonIndex !== -1 && colonIndex < 80) {
      titlePart = paragraph.substring(0, colonIndex + 1);
      bodyPart = paragraph.substring(colonIndex + 1);
    }
    for (const term of terms) {
      const nterm = norm(term);
      if (nterm && titlePart && norm(titlePart).includes(nterm)) {
        titleOccurrences += 1;
        results.push({ term, lesson: l.title || l.id, title: titlePart.slice(0, 50) });
      }
    }
  }
}

console.log('=== مصطلحات ظاهرة في العنوان (قبل القولون) — دلوقتي بيتعرفوا ===');
results.forEach((r) => console.log(`- [${r.term}] في مسألة: "${r.lesson}" | العنوان: "${r.title}"`));
console.log('\nإجمالي مرات الظهور في العنوان:', titleOccurrences);