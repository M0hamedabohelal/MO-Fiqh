import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const readmePath = join(root, 'README.md');

function findTestFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(fullPath));
    } else if (/\.test\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const testFiles = findTestFiles(join(root, 'src'));
let totalTests = 0;

for (const filePath of testFiles) {
  const content = readFileSync(filePath, 'utf8');
  const matches = content.match(/\b(it|test)(\.[a-z]+)?\s*\(/g) || [];
  totalTests += matches.length;
}

const filesCount = testFiles.length;
const testsCount = totalTests;

console.log(`📊 إحصائيات الاختبارات المكتشفة: ${filesCount} ملف اختبار، ${testsCount} اختبار وحدة.`);

let readmeContent = readFileSync(readmePath, 'utf8');

// استبدال أرقام ملفات واختبارات Vitest في README
const pattern = /\*\*(\d+)\s*ملف اختبار\*\*\s*تحوي\s*\*\*(\d+)\s*اختبار وحدة\*\*/g;
if (pattern.test(readmeContent)) {
  readmeContent = readmeContent.replace(
    pattern,
    `**${filesCount} ملف اختبار** تحوي **${testsCount} اختبار وحدة**`
  );
  writeFileSync(readmePath, readmeContent, 'utf8');
  console.log('✅ تم تحديث أرقام الاختبارات في README.md تلقائيًا.');
} else {
  console.warn('⚠️ لم يُعثر على نمط أرقام الاختبارات في README.md.');
}
