import { describe, it, expect } from 'vitest';
import { pickLatestStopMarkId } from './stopMarkRecency';

describe('pickLatestStopMarkId', () => {
  it('يرجع null بلا علامات', () => {
    expect(pickLatestStopMarkId({}, {})).toBeNull();
  });

  it('يتجاهل القيم الفارغة', () => {
    expect(pickLatestStopMarkId({ 'أ': '', 'ب': '7' }, {})).toBe('7');
  });

  it('يفضّل صاحب أحدث لمسة مسجلة', () => {
    const marks = { 'الطهارة': '5', 'الصلاة': '9', 'الزكاة': '12' };
    expect(pickLatestStopMarkId(marks, { 'الطهارة': 100, 'الصلاة': 300, 'الزكاة': 200 })).toBe('9');
  });

  it('بلا سجل لمسات: يرجع آخر قيمة (توافق مع السلوك القديم)', () => {
    const marks = { 'الطهارة': '5', 'الصلاة': '9' };
    expect(pickLatestStopMarkId(marks, {})).toBe('9');
  });

  it('بلا سجل لمسات: يختار أكبر معرّف رقمي (الأحدث فعليًا) لا آخر مفتاح إدخال', () => {
    // المفتاح الأكبر معرّفًا (12) أُدرج أولًا — يجب اختياره هو لا '5'
    const marks = { 'الزكاة': '12', 'الطهارة': '5' };
    expect(pickLatestStopMarkId(marks, {})).toBe('12');
  });

  it('بلا سجل ومعرّفات غير رقمية: يرجع لآخر قيمة', () => {
    const marks = { 'أ': 'abc', 'ب': 'xyz' };
    expect(pickLatestStopMarkId(marks, {})).toBe('xyz');
  });

  it('لمسة واحدة مسجلة تتفوق على غياب البقية', () => {
    const marks = { 'الطهارة': '5', 'الصلاة': '9' };
    expect(pickLatestStopMarkId(marks, { 'الطهارة': 50 })).toBe('5');
  });
});
