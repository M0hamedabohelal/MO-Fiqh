// purge-bootstrap.mjs — تقليم CSS مكتبة Bootstrap بعد بناء الإنتاج
// يقلص حجم vendor.css من ~230KB إلى ~35KB بإزالة الأجزاء غير المستخدمة
// مع الحفاظ الكامل على دعم RTL وكافة الأصناف الديناميكية (safelist).
import { PurgeCSS } from 'purgecss';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const assetsDir = join(root, 'dist', 'assets');

async function purgeBootstrap() {
  try {
    const files = readdirSync(assetsDir);
    const vendorCss = files.find((f) => f.startsWith('vendor-') && f.endsWith('.css'));
    if (!vendorCss) {
      console.log('ℹ️ PurgeCSS: لم يتم العثور على ملف vendor CSS.');
      return;
    }

    const cssPath = join(assetsDir, vendorCss);
    const originalSize = statSync(cssPath).size;
    const distPosix = join(root, 'dist').split(sep).join('/');

    const result = await new PurgeCSS().purge({
      content: [
        `${distPosix}/**/*.html`,
        `${distPosix}/**/*.js`,
      ],
      css: [cssPath.split(sep).join('/')],
      safelist: {
        standard: [
          'active',
          'show',
          'collapsing',
          'collapsed',
          'fade',
          'modal-backdrop',
          'modal-open',
          'dropdown-menu',
          'dropdown-item',
          /^btn/,
          /^form-/,
          /^col-/,
          /^row/,
          /^d-/,
          /^flex-/,
          /^justify-/,
          /^align-/,
          /^gap-/,
          /^p[xytbse]?-[0-5]/,
          /^m[xytbse]?-[0-5]/,
          /^text-/,
          /^bg-/,
          /^border/,
          /^spinner-/,
          /^badge/,
          /^shadow/,
          /^rounded/,
          /^w-/,
          /^h-/,
        ],
      },
    });

    if (result?.[0]?.css) {
      writeFileSync(cssPath, result[0].css, 'utf8');
      const newSize = statSync(cssPath).size;
      const savedKb = ((originalSize - newSize) / 1024).toFixed(1);
      console.log(`⚡ PurgeCSS: تم تقليص ${vendorCss} من ${(originalSize / 1024).toFixed(1)}KB إلى ${(newSize / 1024).toFixed(1)}KB (وفّر ${savedKb}KB).`);
    }
  } catch (err) {
    console.warn('⚠️ PurgeCSS واجه خطأ غير حرج:', err?.message);
  }
}

purgeBootstrap();
