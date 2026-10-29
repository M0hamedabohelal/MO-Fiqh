import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const fontDir = path.join(root, 'public', 'fonts');

async function downloadFonts() {
  if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir, { recursive: true });

  // تنزيل الخطوط الأساسية فقط (بدون italic لعدم استخدامه في النصوص العربية، واقتصار الخطوط على arabic + latin)
  const url = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&display=swap';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const css = await res.text();

  // تحليل كتل @font-face مع التعليق الذي يسبقها (الذي يحدد الـ subset)
  const regex = /\/\*\s*([^*]+)\*\/\s*@font-face\s*\{([^}]+)\}/g;
  const filteredBlocks = [];
  const generatedFiles = new Set();
  let m;

  while ((m = regex.exec(css)) !== null) {
    const rawSubset = m[1].trim().toLowerCase();
    const body = m[2];

    // استثناء مجموعات الحروف غير المستخدمة (مثل latin-ext) لتقليص حجم التنزيل
    if (rawSubset === 'latin-ext') continue;

    const urlMatch = body.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
    if (!urlMatch) continue;

    const fontUrl = urlMatch[1];
    const familyMatch = body.match(/font-family:\s*['"]?([^'";]+)/);
    const weightMatch = body.match(/font-weight:\s*(\d+)/);
    const styleMatch = body.match(/font-style:\s*(\w+)/);

    const style = styleMatch ? styleMatch[1].trim() : 'normal';
    // استبعاد أي نمط مائل إن وُجد
    if (style === 'italic') continue;

    const family = (familyMatch ? familyMatch[1].trim() : 'font').replace(/\s+/g, '-');
    const weight = weightMatch ? weightMatch[1].trim() : '400';
    const subset = rawSubset.replace(/[^a-z0-9]/g, '');

    const filename = `${family}-${weight}-${style}-${subset}.woff2`;
    const localPath = path.join(fontDir, filename);
    generatedFiles.add(filename);

    console.log(`Downloading ${filename} (${subset})...`);
    const fontRes = await fetch(fontUrl);
    const buffer = await fontRes.arrayBuffer();
    fs.writeFileSync(localPath, Buffer.from(buffer));

    const updatedBlock = `/* ${rawSubset} */\n@font-face {${body.replace(fontUrl, `/fonts/${filename}`)}\n}`;
    filteredBlocks.push(updatedBlock);
  }

  // إزالة أي ملفات woff2 قديمة لم تعد جزءاً من الخطوط المستهدفة
  const existingFiles = fs.readdirSync(fontDir);
  for (const file of existingFiles) {
    if (file.endsWith('.woff2') && !generatedFiles.has(file)) {
      console.log(`Cleaning old font file: ${file}`);
      fs.unlinkSync(path.join(fontDir, file));
    }
  }

  const outputCss = filteredBlocks.join('\n\n') + '\n';
  fs.writeFileSync(path.join(fontDir, 'fonts.css'), outputCss, 'utf8');
  console.log(`✅ تم تنزيل الخطوط بنجاح وإنشاء fonts.css (${filteredBlocks.length} كتل خطوط، تم استبعاد italic و latin-ext).`);
}

downloadFonts().catch(console.error);
