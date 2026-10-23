// مصدر المحتوى المعروض — قرار واحد صريح بدل «أول ما يصل».
// السبب: اللقطة المضمّنة في البناء (src/data/lessons.ts) نسخة ثابتة قد تتقادم عن
// المحتوى الحقيقي في Firestore (كانت 16 مسألة مقابل 84). عرضها صامتة كأنها الكتاب
// كله خطأ محتوى لا خطأ عرض — لذلك لا تُستخدم وقت التشغيل إطلاقًا، وتُقتصر على:
//   1) مدخلًا لسكربت SEO عند البناء،
//   2) مقارنة «البناء ↔ السحابة» داخل لوحة الإدارة.
export type ContentSource = 'cloud' | 'cache' | 'empty';

interface ContentSourceInput {
  /** وصلت لقطة خادمية مؤكدة من مستمع المسائل */
  cloudLoaded: boolean;
  /** عدد المسائل المتاحة من الكاش المحلي (IndexedDB/localStorage) */
  cachedCount: number;
}

export function resolveContentSource(input: ContentSourceInput): ContentSource {
  if (input.cloudLoaded) return 'cloud';
  if (input.cachedCount > 0) return 'cache';
  return 'empty';
}

/** هل المستخدم لا يرى أي مسألة الآن؟ (حالة تحتاج تدخلًا صريحًا لا عرضًا صامتًا) */
export const isEmptyContent = (source: ContentSource): boolean => source === 'empty';

/** نص عربي مختصر لوصف المصدر في الواجهة */
export function describeContentSource(source: ContentSource): string {
  switch (source) {
    case 'cloud':
      return 'مباشر من السحابة';
    case 'cache':
      return 'نسخة محفوظة على الجهاز';
    default:
      return 'لا يوجد محتوى متاح';
  }
}
