// توليد أصول الهوية البصرية من logo2.jpg (أو logo1.jpg): شعار دائري بشفافية + صورة المشاركة
// يُنفَّذ: npm run brand
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_SRC = existsSync(join(root, 'src', 'assets', 'logo2.jpg'))
  ? join(root, 'src', 'assets', 'logo2.jpg')
  : existsSync(join(root, 'src', 'assets', 'logo1.jpg'))
    ? join(root, 'src', 'assets', 'logo1.jpg')
    : null;
const OUT_LOGO = join(root, 'src', 'assets', 'logo-circle.webp');
const OUT_OG = join(root, 'public', 'og-image.jpg');

const DARK_BG = { r: 16, g: 20, b: 20, alpha: 1 }; // #101414 — نفس theme-color

/** قناع دائري: يبقي ما بداخل الدائرة ويجعل ما حولها شفافًا (dest-in) */
const circleMask = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );

if (RAW_SRC) {
  // ─── ١) إيجاد حدود الحلقة الذهبية في الأصل الخام ───
  const { data, info } = await sharp(RAW_SRC).raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const CH = info.channels;

  let minX = W;
  let minY = H;
  let maxX = 0;
  let maxY = 0;
  let hits = 0;

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * CH;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r >= 120 && g >= 85 && r - b >= 45 && r - g >= 15 && g - b >= 25) {
        hits += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const ratio = hits / (W * H);
  if (ratio < 0.005 || ratio > 0.85 || maxX <= minX || maxY <= minY) {
    throw new Error(`فشل كشف الحلقة (hits=${hits}, ratio=${ratio.toFixed(3)})`);
  }

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const pad = Math.round(Math.max(boxW, boxH) * 0.015);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let S = Math.max(boxW, boxH) + pad * 2;
  if (S > W) S = W;
  if (S > H) S = H;
  let left = Math.round(cx - S / 2);
  let top = Math.round(cy - S / 2);
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (left + S > W) left = W - S;
  if (top + S > H) top = H - S;

  console.log(`الأصل: ${W}x${H} | صندوق الحلقة: ${minX},${minY} ${boxW}x${boxH} | القصّ: ${left},${top} ${S}x${S}`);

  const crop = { left, top, width: S, height: S };

  const LOGO_SIZE = 640;
  const roundLogo = await sharp(RAW_SRC)
    .extract(crop)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'cover' })
    .ensureAlpha()
    .composite([{ input: circleMask(LOGO_SIZE), blend: 'dest-in' }])
    .webp({ quality: 88, alphaQuality: 95, effort: 5 })
    .toBuffer();
  await writeFile(OUT_LOGO, roundLogo);
  console.log(`✓ logo-circle.webp (${(roundLogo.length / 1024).toFixed(0)} KB)`);
}

// ─── ٢) مصدر الشعار الدائري الحالي ───
const SOURCE_CIRCLE = OUT_LOGO;

// ─── ٣) صورة المشاركة (1200x630 القياسية للمنصات 1.91:1) ───
const OG_W = 1200;
const OG_H = 630;
const OG_LOGO = 520;
const roundOg = await sharp(SOURCE_CIRCLE)
  .resize(OG_LOGO, OG_LOGO, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toBuffer();

await sharp({ create: { width: OG_W, height: OG_H, channels: 4, background: DARK_BG } })
  .composite([{ input: roundOg, top: Math.round((OG_H - OG_LOGO) / 2), left: Math.round((OG_W - OG_LOGO) / 2) }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(OUT_OG);
console.log('✓ og-image.jpg (1200x630)');

// ─── ٤) أيقونة المتصفح SVG ───
const FAV = 64;
const favPng = await sharp(SOURCE_CIRCLE)
  .resize(FAV, FAV, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toBuffer();
const favSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FAV} ${FAV}">` +
  `<image width="${FAV}" height="${FAV}" href="data:image/png;base64,${favPng.toString('base64')}"/></svg>`;
await writeFile(join(root, 'public', 'favicon.svg'), favSvg);
console.log(`✓ favicon.svg (${(favSvg.length / 1024).toFixed(0)} KB)`);

// ─── ٥) أيقونات الـ PWA والتطبيقات والـ Favicon لجوجل والمتصفحات (48, 96, 192, 512, ICO) ───
const iconsDir = join(root, 'public', 'icons');
await mkdir(iconsDir, { recursive: true });

const webpOpts = { quality: 90, alphaQuality: 95, effort: 5 };

// 48x48 (مطلوبة لمحركات البحث ومظهر جوجل في نتائج البحث)
const icon48 = await sharp(SOURCE_CIRCLE)
  .resize(48, 48, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(join(iconsDir, 'icon-48.png'), icon48);
const icon48Webp = await sharp(SOURCE_CIRCLE)
  .resize(48, 48, { fit: 'cover' })
  .webp(webpOpts)
  .toBuffer();
await writeFile(join(iconsDir, 'icon-48.webp'), icon48Webp);

// 96x96
const icon96 = await sharp(SOURCE_CIRCLE)
  .resize(96, 96, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(join(iconsDir, 'icon-96.png'), icon96);
const icon96Webp = await sharp(SOURCE_CIRCLE)
  .resize(96, 96, { fit: 'cover' })
  .webp(webpOpts)
  .toBuffer();
await writeFile(join(iconsDir, 'icon-96.webp'), icon96Webp);

// 192x192
const icon192 = await sharp(SOURCE_CIRCLE)
  .resize(192, 192, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(join(iconsDir, 'icon-192.png'), icon192);
const icon192Webp = await sharp(SOURCE_CIRCLE)
  .resize(192, 192, { fit: 'cover' })
  .webp(webpOpts)
  .toBuffer();
await writeFile(join(iconsDir, 'icon-192.webp'), icon192Webp);

// 512x512
const icon512 = await sharp(SOURCE_CIRCLE)
  .resize(512, 512, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(join(iconsDir, 'icon-512.png'), icon512);
const icon512Webp = await sharp(SOURCE_CIRCLE)
  .resize(512, 512, { fit: 'cover' })
  .webp(webpOpts)
  .toBuffer();
await writeFile(join(iconsDir, 'icon-512.webp'), icon512Webp);

// توليد favicon.ico متعدد الأحجام (16 + 32 + 48) في جذر الموقع لجوجل
const p16 = await sharp(SOURCE_CIRCLE).resize(16, 16, { fit: 'cover' }).png().toBuffer();
const p32 = await sharp(SOURCE_CIRCLE).resize(32, 32, { fit: 'cover' }).png().toBuffer();
const icoImages = [
  { width: 16, height: 16, buffer: p16 },
  { width: 32, height: 32, buffer: p32 },
  { width: 48, height: 48, buffer: icon48 },
];

const icoCount = icoImages.length;
const icoHeaderSize = 6 + icoCount * 16;
let icoOffset = icoHeaderSize;
const icoDirEntries = [];

for (const img of icoImages) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(img.width, 0);
  entry.writeUInt8(img.height, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(img.buffer.length, 8);
  entry.writeUInt32LE(icoOffset, 12);
  icoDirEntries.push(entry);
  icoOffset += img.buffer.length;
}

const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(icoCount, 4);

const icoBuffer = Buffer.concat([icoHeader, ...icoDirEntries, ...icoImages.map((i) => i.buffer)]);
await writeFile(join(root, 'public', 'favicon.ico'), icoBuffer);
console.log(`✓ favicon.ico (${(icoBuffer.length / 1024).toFixed(1)} KB) [16x16, 32x32, 48x48]`);

// maskable 512x512 (منطقة آمنة: الشعار بقطر ~400px في المنتصف مع خلفية داكنة #101414)
const MASKABLE_LOGO_SIZE = 400;
const maskableLogoPart = await sharp(SOURCE_CIRCLE)
  .resize(MASKABLE_LOGO_SIZE, MASKABLE_LOGO_SIZE, { fit: 'cover' })
  .toBuffer();

const iconMaskable = await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: DARK_BG,
  },
})
  .composite([
    {
      input: maskableLogoPart,
      top: Math.round((512 - MASKABLE_LOGO_SIZE) / 2),
      left: Math.round((512 - MASKABLE_LOGO_SIZE) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(join(iconsDir, 'icon-maskable-512.png'), iconMaskable);

const iconMaskableWebp = await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: DARK_BG,
  },
})
  .composite([
    {
      input: maskableLogoPart,
      top: Math.round((512 - MASKABLE_LOGO_SIZE) / 2),
      left: Math.round((512 - MASKABLE_LOGO_SIZE) / 2),
    },
  ])
  .webp(webpOpts)
  .toBuffer();
await writeFile(join(iconsDir, 'icon-maskable-512.webp'), iconMaskableWebp);

// apple-touch-icon (180x180 مع خلفية داكنة مناسبة لـ iOS)
const APPLE_SIZE = 180;
const APPLE_LOGO_SIZE = 148;
const appleLogoPart = await sharp(SOURCE_CIRCLE)
  .resize(APPLE_LOGO_SIZE, APPLE_LOGO_SIZE, { fit: 'cover' })
  .toBuffer();

const appleTouchIcon = await sharp({
  create: {
    width: APPLE_SIZE,
    height: APPLE_SIZE,
    channels: 4,
    background: DARK_BG,
  },
})
  .composite([
    {
      input: appleLogoPart,
      top: Math.round((APPLE_SIZE - APPLE_LOGO_SIZE) / 2),
      left: Math.round((APPLE_SIZE - APPLE_LOGO_SIZE) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(join(iconsDir, 'apple-touch-icon.png'), appleTouchIcon);

const appleTouchIconWebp = await sharp({
  create: {
    width: APPLE_SIZE,
    height: APPLE_SIZE,
    channels: 4,
    background: DARK_BG,
  },
})
  .composite([
    {
      input: appleLogoPart,
      top: Math.round((APPLE_SIZE - APPLE_LOGO_SIZE) / 2),
      left: Math.round((APPLE_SIZE - APPLE_LOGO_SIZE) / 2),
    },
  ])
  .webp(webpOpts)
  .toBuffer();
await writeFile(join(iconsDir, 'apple-touch-icon.webp'), appleTouchIconWebp);

console.log('✓ PWA Icons (PNG & WebP): 48, 96, 192, 512, maskable-512, apple-touch-icon (180)');


