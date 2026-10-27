// سكربت تدقيق وتكشيف التكرار في القاموس الفقهي
// الاستخدام: node scripts/audit-glossary.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const glossaryPath = join(root, 'src', 'data', 'glossary.ts');

export function normalizeTerm(s) {
  return String(s || '')
    .normalize('NFKC')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // تشكيل + تطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

export function stripAl(norm) {
  if (norm.startsWith('ال') && norm.length > 3) {
    return norm.slice(2);
  }
  return norm;
}

function parseGlossary() {
  const content = readFileSync(glossaryPath, 'utf8');
  const entries = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)",?/);
    if (match) {
      entries.push({ term: match[1], def: match[2] });
    }
  }
  return entries;
}

export function auditGlossary() {
  const entries = parseGlossary();
  console.log(`\n🔍 تدقيق القاموس الفقهي (${entries.length} مصطلحًا)...\n`);

  // 1. التطابق التام بعد التطبيع (تشكيل/ألف/هاء)
  const normMap = new Map();
  for (const e of entries) {
    const n = normalizeTerm(e.term);
    if (!normMap.has(n)) normMap.set(n, []);
    normMap.get(n).push(e);
  }

  const exactDups = [];
  for (const [norm, list] of normMap.entries()) {
    if (list.length > 1) {
      exactDups.push({ norm, list });
    }
  }

  // 2. التطابق مع إسقاط "ال" التعريف (مثل الخف وخف)
  const bareMap = new Map();
  for (const e of entries) {
    const b = stripAl(normalizeTerm(e.term));
    if (!bareMap.has(b)) bareMap.set(b, []);
    bareMap.get(b).push(e);
  }

  const alDups = [];
  for (const [bare, list] of bareMap.entries()) {
    // نتأكد أنه ليس مكرراً أصلاً في exactDups
    if (list.length > 1) {
      const uniqueNorms = new Set(list.map((x) => normalizeTerm(x.term)));
      if (uniqueNorms.size > 1) {
        alDups.push({ bare, list });
      }
    }
  }

  console.log('──────────────────────────────────────────────────────');
  console.log(`1️⃣  تكرارات متطابقة بعد التطبيع (التشكيل/الألف): ${exactDups.length}`);
  console.log('──────────────────────────────────────────────────────');
  for (const d of exactDups) {
    console.log(`• المصطلح المطبّع: [${d.norm}]`);
    for (const item of d.list) {
      console.log(`   - "${item.term}": "${item.def.slice(0, 50)}..."`);
    }
  }

  console.log('\n──────────────────────────────────────────────────────');
  console.log(`2️⃣  تكرارات بسبب "ال" التعريف الزائدة: ${alDups.length}`);
  console.log('──────────────────────────────────────────────────────');
  for (const d of alDups) {
    console.log(`• المصطلح المجرّد: [${d.bare}]`);
    for (const item of d.list) {
      console.log(`   - "${item.term}": "${item.def.slice(0, 50)}..."`);
    }
  }

  console.log('\n✅ اكتمل الفحص.\n');
  return { exactDups, alDups, totalEntries: entries.length };
}

// تشغيل مباشر
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  auditGlossary();
}
