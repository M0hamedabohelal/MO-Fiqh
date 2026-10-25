// سياسة الاحتفاظ بالنسخ الاحتياطية (Backup Retention Policy)
// الاستخدام: تُستدعى تلقائيًا بعد كل عملية نسخ احتياطي لتنظيف النسخ القديمة
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/**
 * تطبيق سياسة الاحتفاظ بالنسخ الاحتياطية
 * @param {string} dir مجلد النسخ الاحتياطية
 * @param {object} options خيارات الاحتفاظ
 * @param {number} options.maxFiles أقصى عدد ملفات لكل فئة (افتراضي: 10)
 * @param {number} options.maxAgeDays أقصى عمر للملفات بالأيام للنسخ الزائدة عن 3 (افتراضي: 30)
 */
export function applyRetentionPolicy(dir, { maxFiles = 10, maxAgeDays = 30 } = {}) {
  try {
    const files = readdirSync(dir);
    if (!files.length) return { pruned: 0, retained: 0 };

    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    // تجميع الملفات حسب الفئة
    const groups = new Map();
    for (const f of files) {
      const fullPath = join(dir, f);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;

      let prefix = 'other';
      if (f.startsWith('firestore-')) prefix = 'firestore';
      else if (f.startsWith('lessons-local-')) prefix = 'lessons-local';
      else if (f.startsWith('pre-migration-')) prefix = 'pre-migration';

      if (!groups.has(prefix)) groups.set(prefix, []);
      groups.get(prefix).push({ name: f, path: fullPath, mtime: stat.mtimeMs });
    }

    let totalPruned = 0;
    let totalRetained = 0;

    for (const [, list] of groups.entries()) {
      // فرز من الأحدث إلى الأقدم
      list.sort((a, b) => b.mtime - a.mtime);

      list.forEach((item, index) => {
        const isOld = now - item.mtime > maxAgeMs;
        // الاحتفاظ بأحدث النسخ، وحذف ما يتجاوز الحد أو العمر الزائد عن 3
        if (index >= maxFiles || (index >= 3 && isOld)) {
          try {
            unlinkSync(item.path);
            totalPruned++;
            console.log(`   🧹 سياسة الاحتفاظ: حذف نسخة قديمة: ${item.name}`);
          } catch (err) {
            console.warn(`   ⚠️ تعذر حذف ${item.name}: ${err.message}`);
            totalRetained++;
          }
        } else {
          totalRetained++;
        }
      });
    }

    if (totalPruned > 0) {
      console.log(`✅ سياسة الاحتفاظ: تم تنظيف ${totalPruned} ملفات قديمة والاحتفاظ بـ ${totalRetained} ملفات.`);
    }

    return { pruned: totalPruned, retained: totalRetained };
  } catch (err) {
    console.warn(`⚠️ تعذر تطبيق سياسة الاحتفاظ: ${err.message}`);
    return { pruned: 0, retained: 0 };
  }
}
