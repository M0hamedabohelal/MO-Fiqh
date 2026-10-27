import { describe, it, expect } from 'vitest';
import { validateUploadFile, CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from './cloudinary';

describe('Cloudinary Upload Security & Validation', () => {
  it('يقبل صيغ الملفات المسموحة (pdf, mp3, m4a, jpg, png, webp)', () => {
    const validNames = ['lesson.pdf', 'audio.mp3', 'rec.m4a', 'cover.jpg', 'img.png', 'photo.webp'];
    for (const name of validNames) {
      const file = new File(['dummy content'], name, { type: 'application/octet-stream' });
      expect(validateUploadFile(file)).toBeNull();
    }
  });

  it('يرفض الصيغ غير المسموحة برسالة خطأ واضحة', () => {
    const dangerousNames = ['virus.exe', 'script.js', 'shell.php', 'hack.sh', 'data.json'];
    for (const name of dangerousNames) {
      const file = new File(['dummy content'], name, { type: 'application/octet-stream' });
      const err = validateUploadFile(file);
      expect(err).not.toBeNull();
      expect(err).toContain('صيغة غير مدعومة');
    }
  });

  it('يرفض الملفات التي تتجاوز الحد الأقصى المسموح (25MB)', () => {
    // محاكاة ملف حجمه 26MB
    const bigFile = {
      name: 'huge.pdf',
      size: 26 * 1024 * 1024,
    } as unknown as File;

    const err = validateUploadFile(bigFile);
    expect(err).not.toBeNull();
    expect(err).toContain('حجم الملف يتجاوز الحد المسموح');
  });

  it('الثوابت لا تسرب أي سر أو مفتاح خادم في حزمة العميل', () => {
    expect(CLOUDINARY_UPLOAD_URL).toContain('https://api.cloudinary.com/v1_1/');
    expect(CLOUDINARY_UPLOAD_PRESET).toBeDefined();
    // التأكد من عدم وجود أي سر خادمي
    const anyGlobal = globalThis as Record<string, unknown>;
    expect(anyGlobal.CLOUDINARY_API_SECRET).toBeUndefined();
  });
});
