// قائمة معرّفات المسائل المضمّنة فقط — خفيفة (~0.5KB) لمنع تضمين ملف المسائل الكامل (348KB) في حزمة المتصفح
import rawIds from '../../data/content/bundled-ids.json' with { type: 'json' };

export const bundledLessonIds: string[] = rawIds as string[];
