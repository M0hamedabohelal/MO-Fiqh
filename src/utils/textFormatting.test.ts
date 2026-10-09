import { describe, it, expect } from 'vitest';
import { isValidElement } from 'react';
import { isHadithText, formatBrackets } from './textFormatting';

describe('isHadithText', () => {
  it('يعتبر النص المبدوء بـ « حديثًا', () => {
    expect(isHadithText('«قال رسول الله ﷺ: الماء طهور»')).toBe(true);
  });

  it('يكشف القوس المحتوي على كلمة حديثية دالة', () => {
    expect(isHadithText('(إذا بلغ الماء قلتين لم يحمل الخبث)')).toBe(true);
  });

  it('يرفض القوس العادي بلا دلالة حديثية', () => {
    expect(isHadithText('(توضيح لغوي للمصطلح)')).toBe(false);
  });

  it('يرفض النص العادي', () => {
    expect(isHadithText('الطهارة هي مفتاح الصلاة')).toBe(false);
  });

  it('يتسامح مع المسافات المحيطة', () => {
    expect(isHadithText('  «الحج المبرور ليس له جزاء إلا الجنة»  ')).toBe(true);
  });
});

describe('formatBrackets', () => {
  it('يحوّل إحالة [نص](lesson:id) إلى رابط صحيح', () => {
    const nodes = formatBrackets('راجع [المسألة الخامسة](lesson:5) للمزيد', '', undefined);
    const arr = Array.isArray(nodes) ? nodes : [nodes];
    const link = arr.find(
      (n) => isValidElement(n) && n.type === 'a' && (n.props as { href?: string }).href === '#/lesson/5',
    );
    expect(link).toBeDefined();
  });

  it('يُبرز الآية بكلاس quran-text', () => {
    const nodes = formatBrackets('قال تعالى {إِنَّمَا الْمُشْرِكُونَ نَجَسٌ} ثم أكمل', '', undefined);
    const arr = Array.isArray(nodes) ? nodes : [nodes];
    const quran = arr.find(
      (n) => isValidElement(n) && (n.props as { className?: string }).className === 'quran-text',
    );
    expect(quran).toBeDefined();
  });
});
