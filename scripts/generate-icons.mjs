// توليد أيقونات PWA من اللوجو SVG (يُنفذ مرة واحدة: npm run icons)
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'public', 'favicon.svg');
const outDir = join(root, 'public', 'icons');

await mkdir(outDir, { recursive: true });

const jobs = [
  // أيقونات عادية بخلفية شفافة
  { name: 'pwa-192.png', size: 192, background: undefined },
  { name: 'pwa-512.png', size: 512, background: undefined },
  // أيقونات maskable بخلفية بيضاء وشعار مصغّر في منطقة الأمان
  { name: 'maskable-192.png', size: 192, background: '#ffffff', scale: 0.72 },
  { name: 'maskable-512.png', size: 512, background: '#ffffff', scale: 0.72 },
  // أيقونة iOS (لا تدعم الشفافية)
  { name: 'apple-touch-icon.png', size: 180, background: '#ffffff', scale: 0.84 },
];

for (const { name, size, background, scale = 1 } of jobs) {
  const inner = Math.round(size * scale);
  const offset = Math.round((size - inner) / 2);
  const layers = [{ input: Buffer.from(await sharp(src, { density: 512 }).resize(inner).png().toBuffer()), top: offset, left: offset }];
  if (background) {
    layers.unshift({ input: { create: { width: size, height: size, channels: 4, background } }, top: 0, left: 0 });
  }
  await sharp({ create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png()
    .toFile(join(outDir, name));
  console.log('✓', name);
}
