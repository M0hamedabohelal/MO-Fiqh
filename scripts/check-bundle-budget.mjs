// فحص ميزانية الحزمة (Bundle Size Budget) لـ CI — يمنع تضخم الحزم بدون انتباه
// يُنفَّذ: npm run check:budget
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist', 'assets');

if (!fs.existsSync(distDir)) {
  console.error('❌ مجلد dist/assets غير موجود. نفّذ npm run build أولاً.');
  process.exit(1);
}

const files = fs.readdirSync(distDir);

/** حساب الحجم الخام وحجم gzip بالبايت */
function getSizes(filePath) {
  const content = fs.readFileSync(filePath);
  const rawBytes = content.length;
  const gzipBytes = zlib.gzipSync(content).length;
  return { rawBytes, gzipBytes };
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

// تعريف ميزانية الحزم (بالكيلوبايت بعد الضغط Gzip)
const BUDGETS = [
  {
    name: 'شارد المدخل الرئيسي (index-*.js)',
    pattern: /^index-.*\.js$/,
    maxGzipKb: 45,
  },
  {
    name: 'شاشة القراءة (ReadingView-*.js)',
    pattern: /^ReadingView-.*\.js$/,
    maxGzipKb: 20,
  },
  {
    name: 'حزمة الأيقونات (icons-*.js)',
    pattern: /^icons-.*\.js$/,
    maxGzipKb: 15,
  },
  {
    name: 'تنسيقات البوتستراب المطهّرة (vendor-*.css)',
    pattern: /^vendor-.*\.css$/,
    maxGzipKb: 25,
  },
  {
    name: 'التنسيقات العامة (index-*.css)',
    pattern: /^index-.*\.css$/,
    maxGzipKb: 20,
  },
  {
    name: 'حزمة ريأكت الأساسية (react-core-*.js)',
    pattern: /^react-core-.*\.js$/,
    maxGzipKb: 65,
  },
  {
    name: 'حزمة الحركات (motion-*.js)',
    pattern: /^motion-.*\.js$/,
    maxGzipKb: 48,
  },
];

console.log('📊 فحص ميزانية الحجم (Bundle Size Budget Check):\n');
let hasFailure = false;
let totalJsGzip = 0;
let totalCssGzip = 0;

for (const budget of BUDGETS) {
  const matchingFile = files.find((f) => budget.pattern.test(f));
  if (!matchingFile) {
    console.warn(`⚠️  لم يُعثر على ملف مطابق لـ: ${budget.name}`);
    continue;
  }

  const { rawBytes, gzipBytes } = getSizes(path.join(distDir, matchingFile));
  const gzipKb = gzipBytes / 1024;
  const status = gzipKb <= budget.maxGzipKb ? '✅' : '❌';

  console.log(
    `${status} ${budget.name}: ${formatKb(gzipBytes)} gzip (الحد الأقصى: ${budget.maxGzipKb} KB) [الخام: ${formatKb(rawBytes)}] → ${matchingFile}`,
  );

  if (gzipKb > budget.maxGzipKb) {
    hasFailure = true;
  }
}

// حساب إجمالي كل ملفات JS و CSS
for (const f of files) {
  if (f.endsWith('.js')) {
    const { gzipBytes } = getSizes(path.join(distDir, f));
    totalJsGzip += gzipBytes;
  } else if (f.endsWith('.css')) {
    const { gzipBytes } = getSizes(path.join(distDir, f));
    totalCssGzip += gzipBytes;
  }
}

console.log('\n📦 إجماليات الإنتاج (كل الشاردات مجتمعة):');
console.log(`   - إجمالي JS (gzip): ${formatKb(totalJsGzip)}`);
console.log(`   - إجمالي CSS (gzip): ${formatKb(totalCssGzip)}`);

// سقف وقائي لإجمالي جافاسكربت وتنسيقات
const TOTAL_JS_LIMIT_KB = 500;
if (totalJsGzip / 1024 > TOTAL_JS_LIMIT_KB) {
  console.error(`❌ إجمالي JS (${formatKb(totalJsGzip)}) تجاوز السقف الإجمالي الوقائي (${TOTAL_JS_LIMIT_KB} KB)!`);
  hasFailure = true;
}

if (hasFailure) {
  console.error('\n❌ فشل فحص الميزانية: هناك ملفات تجاوزت الحد الأقصى المسموح به.');
  process.exit(1);
}

console.log('\n🎉 جميع الحزم ضمن الميزانية المحددة بنجاح!');
