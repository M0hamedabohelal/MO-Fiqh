// لقطة المسائل المحلية — المحتوى يُحفظ مفصولاً في data/content/lessons.json
// لضمان عدم خلط تحديثات المحتوى مع الكوميتات البرمجية داخل src/
import type { Lesson } from '../types';
import rawLessons from '../../data/content/lessons.json' with { type: 'json' };

export const lessonsData: Lesson[] = rawLessons as Lesson[];
