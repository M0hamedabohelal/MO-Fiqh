import { describe, it, expect } from 'vitest';
import { splitSentences, generateQuiz, quizBestKey } from './quizUtil';
import type { Lesson } from '../types';

const mk = (id: number, title: string, mainText: string, sheikhExplanation = ''): Lesson => ({
  id,
  bookName: 'كتاب الطهارة',
  chapterName: 'الباب الأول',
  title,
  mainText,
  sheikhExplanation,
});

const L1 = mk(
  1,
  'المسألة الأولى',
  'الطهارة يجب أن تكون بالماء الطهور الذي لم يتغير لونه ولا طعمه ولا رائحته. الماء الكثير إذا بلغ قلتين لم يحمل الخبث عند الجمهور.',
  'اعلم أن رفع الحدث يجب أن يكون بنية خالصة لله تعالى وحده.',
);
const L2 = mk(
  2,
  'المسألة الثانية',
  'الوضوء واجب على كل مسلم بالغ عاقل عند إرادة الصلاة. غسل الوجه واليدين إلى المرفقين من فرائض الوضوء المتفق عليها.',
);
const L3 = mk(
  3,
  'المسألة الثالثة',
  'التيمم يجوز عند فقد الماء أو العجز عن استعماله لمرض. التيمم ضربة واحدة للوجه والكفين على الصحيح من أقوال أهل العلم.',
);

describe('splitSentences', () => {
  it('يقسّم على علامات الترقيم والأسطر', () => {
    expect(
      splitSentences(
        'هذه هي الجملة الأولى الطويلة بما يكفي لتصلح سؤالا. وهذه هي الجملة الثانية الطويلة بما يكفي أيضا! وهذه ثالثة طويلة بما يكفي للاختبار؟',
      ),
    ).toHaveLength(3);
  });

  it('يسقط القصير جدًا والفارغ', () => {
    expect(splitSentences('قصيرة. هذه جملة طويلة بما يكفي لتكون سؤالا مناسبا للاختبار.')).toHaveLength(1);
  });

  it('يجرّد الترقيم الرقمي من أول السطر', () => {
    const [s] = splitSentences('1- هذه جملة مرقمة طويلة بما يكفي لتصلح سؤالا في الاختبار.');
    expect(s.startsWith('1-')).toBe(false);
  });
});

describe('generateQuiz', () => {
  it('يعيد مصفوفة فارغة عند غياب المحتوى الصالح', () => {
    expect(generateQuiz([])).toEqual([]);
    expect(generateQuiz([mk(9, 'فارغة', 'قصير.')])).toEqual([]);
  });

  it('إجابة الاختيار من متعدد تطابق الخيار الصحيح نصًا', () => {
    const qs = generateQuiz([L1, L2, L3], 8);
    const mcqs = qs.filter((q) => q.kind === 'mcq');
    expect(mcqs.length).toBeGreaterThan(0);
    for (const q of mcqs) {
      expect(q.options[q.answerIndex]).toBe(q.source);
      // الخيارات فريدة ولا تتكرر
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('سؤال الخطأ محرّف فعلًا عن المصدر (حتمي: مسألة واحدة بلا مشتتات)', () => {
    // مسألة وحيدة بجملة واحدة قابلة للتحريف: لا اختيار من متعدد (لا مشتتات) → سؤال خطأ واحد حتمًا
    const solo = mk(7, 'منفردة', 'هذه جملة طويلة بما يكفي ويجب أن تكون صالحة للاختبار الحالي.');
    const qs = generateQuiz([solo], 8);
    expect(qs).toHaveLength(1);
    expect(qs[0].kind).toBe('tf');
    expect(qs[0].answerIndex).toBe(1);
    expect(qs[0].options).toEqual(['صح', 'خطأ']);
  });

  it('كل سؤال مولّد بنيويًا سليم', () => {
    const qs = generateQuiz([L1, L2, L3], 8);
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
      expect(q.source.length).toBeGreaterThan(0);
      expect(q.lessonTitle.length).toBeGreaterThan(0);
      if (q.kind === 'mcq') expect(q.options[q.answerIndex]).toBe(q.source);
    }
  });

  it('لا تتكرر الجمل المستخدمة بين الأسئلة', () => {
    const qs = generateQuiz([L1, L2, L3], 8);
    const mcqSources = qs.filter((q) => q.kind === 'mcq').map((q) => q.source);
    expect(new Set(mcqSources).size).toBe(mcqSources.length);
  });

  it('يحترم الحد الأقصى للأسئلة', () => {
    expect(generateQuiz([L1, L2, L3], 3).length).toBeLessThanOrEqual(3);
  });
});

describe('quizBestKey', () => {
  it('مفتاح ثابت لنفس الباب', () => {
    expect(quizBestKey('كتاب الطهارة', 'الباب الأول')).toBe(quizBestKey('كتاب الطهارة', 'الباب الأول'));
    expect(quizBestKey('أ', 'ب')).not.toBe(quizBestKey('أ', 'ج'));
  });
});
