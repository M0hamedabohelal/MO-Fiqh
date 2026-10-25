// فحص جاهزية مفتاح حساب الخدمة (Firebase Admin SDK) للنسخ الاحتياطي الشامل
// الاستخدام: npm run check:backup-key
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(__dirname, 'service-account.json');

if (existsSync(keyPath)) {
  try {
    const key = JSON.parse(readFileSync(keyPath, 'utf8'));
    console.log(`✅ مفتاح المشرف جاهز لمشروع: ${key.project_id}`);
    console.log(`   حساب الخدمة: ${key.client_email}`);
    console.log('   النسخ الاحتياطي سيعمل بكامل صلاحيات المشرف ويشمل مكتبات كل المستخدمين.');
    console.log('   لتشغيل النسخ الاحتياطي الآن: npm run backup');
    process.exit(0);
  } catch (err) {
    console.error(`❌ الملف موجود في ${keyPath} ولكنه ليس بصيغة JSON صالحة:`, err.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️  مفتاح حساب الخدمة غير موجود محلياً (وضع العميل النشط حالياً).');
  console.log(`   المسار المستهدف: ${keyPath}`);
  console.log('   خطوات تفعيل النسخ الشامل لبيانات كل المستخدمين:');
  console.log('   1. افتح رابط لوحة التحكم:');
  console.log('      https://console.firebase.google.com/project/fiqh-app-9f98c/settings/serviceaccounts/adminsdk');
  console.log('   2. اضغط على زر "Generate new private key" (توليد مفتاح خاص جديد).');
  console.log('   3. احفظ الملف المحمّل باسم "service-account.json" داخل مجلد "scripts/".');
  console.log('   4. أعد تشغيل هذا الفحص: npm run check:backup-key');
  process.exit(0);
}
