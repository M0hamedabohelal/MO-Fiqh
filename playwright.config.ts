import { defineConfig, devices } from '@playwright/test';

// اختبارات التكامل الحقيقية (DOM + شبكة) على مقاس فون.
// تعمل على نسخة الإنتاج المحلية (dist) لا على الموقع المنشور، حتى تحكم على الكود
// الذي بين يديها لا على آخر نشر.
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  // لاحقة .e2e فقط: Vitest يلتقط *.test و *.spec فلا تتصادم الأُطر
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  // تسلسل: الخادم واحد، والتخزين المحلي مشترك بين الاختبارات
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Pixel 7'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'ar-EG',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
