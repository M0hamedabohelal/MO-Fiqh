// توليد أصول الهوية البصرية من logo1.jpg: شعار دائري بشفافية + صورة المشاركة
// يُنفَّذ مرة واحدة: node scripts/build-brand-assets.mjs
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src', 'assets', 'logo1.jpg');
const OUT_LOGO = join(root, 'src', 'assets', 'logo-circle.webp');
const OUT_OG = join(root, 'public', 'og-image.png');

const DARK_BG = { r: 16, g: 20, b: 20, alpha: 1 }; // #101414 — نفس theme-color

/** قناع دائري: يبقي ما بداخل الدائرة ويجعل ما حولها شفافًا (dest-in) */
const circleMask = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );

// ─── ١) إيجاد حدود الحلقة الذهبية في الأصل ───
const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
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
    // الذهبي (الحلقة + الذهباء): دافئ ومشعّ، ونستبعد السماء الفاتحة والخلفية الداكنة
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

// توسعة صغيرة حتى لا نقصّ حافة الحلقة، ثم تلزيم الشكل مربعًا حول المركز
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

// ─── ٢) الشعار الدائري المضمن في التطبيق ───
const LOGO_SIZE = 640;
const roundLogo = await sharp(SRC)
  .extract(crop)
  .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'cover' })
  .ensureAlpha()
  .composite([{ input: circleMask(LOGO_SIZE), blend: 'dest-in' }])
  .webp({ quality: 88, alphaQuality: 95, effort: 5 })
  .toBuffer();
await writeFile(OUT_LOGO, roundLogo);
console.log(`✓ logo-circle.webp (${(roundLogo.length / 1024).toFixed(0)} KB)`);

// ─── ٣) صورة المشاركة (1024x1024) ───
const OG = 1024;
const OG_LOGO = 700;
const roundOg = await sharp(SRC)
  .extract(crop)
  .resize(OG_LOGO, OG_LOGO, { fit: 'cover' })
  .ensureAlpha()
  .composite([{ input: circleMask(OG_LOGO), blend: 'dest-in' }])
  .png({ compressionLevel: 9 })
  .toBuffer();

await sharp({ create: { width: OG, height: OG, channels: 4, background: DARK_BG } })
  .composite([{ input: roundOg, top: Math.round((OG - OG_LOGO) / 2), left: Math.round((OG - OG_LOGO) / 2) }])
  .png({ compressionLevel: 9 })
  .toFile(OUT_OG);
console.log('✓ og-image.png');

// ─── ٤) أيقونة المتصفح SVG (الشعار مدمج base64 — يعمل بلا ملفات إضافية) ───
const FAV = 128;
const favPng = await sharp(SRC)
  .extract(crop)
  .resize(FAV, FAV, { fit: 'cover' })
  .ensureAlpha()
  .composite([{ input: circleMask(FAV), blend: 'dest-in' }])
  .png({ compressionLevel: 9 })
  .toBuffer();
const favSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FAV} ${FAV}">` +
  `<image width="${FAV}" height="${FAV}" href="data:image/png;base64,${favPng.toString('base64')}"/></svg>`;
await writeFile(join(root, 'public', 'favicon.svg'), favSvg);
console.log(`✓ favicon.svg (${(favSvg.length / 1024).toFixed(0)} KB)`);
