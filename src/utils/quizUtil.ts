import type { Lesson } from '../types';

// توليد اختبار ذاتي من نصوص المسائل — يعمل محليًا بالكامل وبلا ذكاء اصطناعي:
// - اختيار من متعدد: عبارة حقيقية من مسألة + مُشتتات من مسائل أخرى (الإجابة مؤكدة من النص)
// - صح/خطأ: عبارة حقيقية (صح) أو عبارة مُحرّفة باستبدال مدروس (خطأ) مع عرض المصدر

export interface QuizQuestion {
  id: string;
  kind: 'mcq' | 'tf';
  prompt: string;
  options: string[];
  answerIndex: number;
  lessonId: string | number;
  lessonTitle: string;
  source: string;
}

// أزواج التحريف للعبارات الخاطئة — الاستبدال الأول المطابق فقط
const NEGATION_PAIRS: Array<[string, string]> = [
  ['لا يجب', 'يجب'],
  ['يجب', 'لا يجب'],
  ['لا يجوز', 'يجوز'],
  ['يجوز', 'لا يجوز'],
  ['لا يصح', 'يصح'],
  ['طاهر', 'نجس'],
  ['نجس', 'طاهر'],
  ['صحيح', 'باطل'],
  ['واجب', 'مستحب'],
];

function perturb(sentence: string): string | null {
  for (const [from, to] of NEGATION_PAIRS) {
    const idx = sentence.indexOf(from);
    if (idx !== -1) {
      return sentence.slice(0, idx) + to + sentence.slice(idx + from.length);
    }
  }
  return null;
}

// تقسيم النص إلى جمل صالحة للأسئلة — إسقاط القصير جدًا والطويل جدًا والترقيم وحده
export function splitSentences(text: string | undefined): string[] {
  if (!text) return [];
  return String(text)
    .split(/[\n.!؟?؛]+/)
    .map((s) => s.replace(/^\s*\d+\s*[-.)]\s*/, '').trim())
    .filter((s) => s.length >= 25 && s.length <= 180);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function lessonSentences(lesson: Lesson): string[] {
  return splitSentences(`${lesson.mainText || ''}\n${lesson.sheikhExplanation || ''}`);
}

export function generateQuiz(lessons: Lesson[], maxQuestions = 8): QuizQuestion[] {
  const usable = lessons.filter((l) => lessonSentences(l).length > 0);
  if (usable.length === 0) return [];

  const questions: QuizQuestion[] = [];
  const usedSentences = new Set<string>();
  let n = 0;
  const push = (q: QuizQuestion): void => {
    n += 1;
    questions.push({ ...q, id: `q${n}` });
  };

  // 1) اختيار من متعدد — يحتاج مُشتتات من مسائل أخرى
  for (const lesson of shuffle(usable)) {
    if (questions.length >= maxQuestions) break;
    const own = shuffle(lessonSentences(lesson).filter((s) => !usedSentences.has(s)));
    if (own.length === 0) continue;
    const correct = own[0];
    const distractPool = shuffle(
      usable
        .filter((l) => String(l.id) !== String(lesson.id))
        .flatMap((l) => lessonSentences(l))
        .filter((s) => !usedSentences.has(s) && s !== correct),
    );
    if (distractPool.length < 2) continue;
    const options = shuffle([correct, ...distractPool.slice(0, 3)]);
    // يُحجز الصحيح فقط — المشتتات قابلة لإعادة الاستخدام وإلا جاعت مرحلة الصح/خطأ
    usedSentences.add(correct);
    push({
      id: '',
      kind: 'mcq',
      prompt: `أي عبارة وردت في «${lesson.title}»؟`,
      options,
      answerIndex: options.indexOf(correct),
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      source: correct,
    });
  }

  // 2) صح / خطأ — تناوب بين عبارة حقيقية ومُحرّفة
  let wantFalse = true;
  for (const lesson of shuffle(usable)) {
    if (questions.length >= maxQuestions) break;
    const candidates = shuffle(lessonSentences(lesson).filter((s) => !usedSentences.has(s)));
    if (candidates.length === 0) continue;
    const sentence = candidates[0];
    const perturbed = perturb(sentence);
    if (wantFalse && perturbed) {
      usedSentences.add(sentence);
      push({
        id: '',
        kind: 'tf',
        prompt: 'هل هذه العبارة صحيحة؟',
        options: ['صح', 'خطأ'],
        answerIndex: 1,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        source: sentence,
      });
      wantFalse = false;
    } else if (!wantFalse) {
      usedSentences.add(sentence);
      push({
        id: '',
        kind: 'tf',
        prompt: 'هل هذه العبارة صحيحة؟',
        options: ['صح', 'خطأ'],
        answerIndex: 0,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        source: sentence,
      });
      wantFalse = true;
    }
    // ملاحظة: إن تعذّر التحريف أُهملت الجملة للدورة الحالية (لا سؤال خطأ مُلفّق)
  }

  return shuffle(questions);
}

// مفتاح حفظ أفضل نتيجة للباب — نصوص عربية آمنة كمفاتيح تخزين
export function quizBestKey(bookName: string, chapterName: string): string {
  return `quiz_best_${bookName}__${chapterName}`;
}

export function readQuizBest(bookName: string, chapterName: string): number {
  try {
    const v = Number(localStorage.getItem(quizBestKey(bookName, chapterName)) || 0);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

export function saveQuizBest(bookName: string, chapterName: string, score: number): number {
  const prev = readQuizBest(bookName, chapterName);
  const best = Math.max(prev, Math.floor(score));
  try {
    localStorage.setItem(quizBestKey(bookName, chapterName), String(best));
  } catch {
    // التخزين غير متاح — النتيجة المعروضة تكفي
  }
  return best;
}
