import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const fontDir = path.join(root, 'public', 'fonts');

async function downloadFonts() {
  if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir, { recursive: true });

  const url = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Amiri:ital,wght@0,400;0,700;1,400&family=Aref+Ruqaa:wght@400;700&display=swap';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const css = await res.text();

  const blocks = css.split('}');
  const arabicBlocks = [];
  let fileIndex = 0;

  for (const block of blocks) {
    if (!block.trim()) continue;
    // نحتفظ بكتل الخطوط المستهدفة
    const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
    if (urlMatch) {
      const fontUrl = urlMatch[1];
      const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)/);
      const weightMatch = block.match(/font-weight:\s*(\d+)/);
      const styleMatch = block.match(/font-style:\s*(\w+)/);
      const family = (familyMatch ? familyMatch[1].trim() : 'font').replace(/\s+/g, '-');
      const weight = weightMatch ? weightMatch[1] : '400';
      const style = styleMatch ? styleMatch[1] : 'normal';

      fileIndex++;
      const filename = `${family}-${weight}-${style}-${fileIndex}.woff2`;
      const localPath = path.join(fontDir, filename);

      console.log(`Downloading ${filename}...`);
      const fontRes = await fetch(fontUrl);
      const buffer = await fontRes.arrayBuffer();
      fs.writeFileSync(localPath, Buffer.from(buffer));

      const updatedBlock = block.replace(fontUrl, `/fonts/${filename}`).trim() + '\n}';
      arabicBlocks.push(updatedBlock);
    }
  }

  const outputCss = arabicBlocks.join('\n\n');
  fs.writeFileSync(path.join(fontDir, 'fonts.css'), outputCss, 'utf8');
  console.log(`✅ تم تنزيل الخطوط بنجاح وإنشاء fonts.css (${arabicBlocks.length} خط).`);
}

downloadFonts().catch(console.error);
