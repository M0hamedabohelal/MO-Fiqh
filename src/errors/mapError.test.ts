import { describe, it, expect } from 'vitest';
import { classifyError, mapError, mapErrorToToast } from './mapError';

// تصنيف كل عائلة خطأ — الشبكة/الوقت/الصلاحية/الحصة/عدم الوجود/النسخة القديمة/المجهول
// إذا تغيّر نص خطأ Firebase أو المتصفح يظهر هذا الاختبار كأول من ينبّه.

describe('classifyError', () => {
  it('شارد قديم بعد النشر ≈ stale لا network', () => {
    const err = new TypeError('Failed to fetch dynamically imported module: https://fqh.me/assets/ReadingView-abc.js');
    expect(classifyError(err).kind).toBe('stale');
  });

  it('err أوفلاين يُقدَّم على التصنيف الشبكي', () => {
    expect(classifyError(new Error('Failed to fetch'), { offline: true }).kind).toBe('offline');
  });

  it('code=unavailable من Firestore = network', () => {
    const err = Object.assign(new Error('The operation could not be completed'), { code: 'unavailable' });
    expect(classifyError(err).kind).toBe('network');
  });

  it('permission-denied = permission وليس notfound', () => {
    const err = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
    expect(classifyError(err).kind).toBe('permission');
  });

  it('resource-exhausted = quota', () => {
    const err = Object.assign(new Error('Resource exhausted'), { code: 'resource-exhausted' });
    expect(classifyError(err).kind).toBe('quota');
  });

  it('not-found = notfound', () => {
    const err = Object.assign(new Error('Document not found'), { code: 'not-found' });
    expect(classifyError(err).kind).toBe('notfound');
  });

  it('AbortError/timeout = timeout', () => {
    expect(classifyError(Object.assign(new Error('Request timed out'), { name: 'AbortError' })).kind).toBe('timeout');
  });

  it('خطأ مجهول = unknown', () => {
    expect(classifyError(new Error('something weird happened')).kind).toBe('unknown');
  });

  it('قيمة غير Error لا ترمي', () => {
    expect(classifyError(null).kind).toBe('unknown');
    expect(classifyError(undefined).kind).toBe('unknown');
    expect(classifyError('Failed to fetch').kind).toBe('network');
  });
});

describe('mapError', () => {
  it('يعيد عرضًا كاملًا مع رمز حادثة مطابق للنمط', () => {
    const p = mapError(new Error('Failed to fetch'));
    expect(p.kind).toBe('network');
    expect(p.retryable).toBe(true);
    expect(p.surface).toBe('card');
    expect(p.actionLabel).toBe('إعادة المحاولة');
    expect(p.incidentId).toMatch(/^err_[0-9a-f]{8}$/);
    expect(p.message.length).toBeGreaterThan(20);
  });

  it('يحترم الرمز والعنوان الممررين', () => {
    const p = mapError(new Error('x'), { incidentId: 'err_0011aabb', title: 'عنوان مخصص' });
    expect(p.incidentId).toBe('err_0011aabb');
    expect(p.title).toBe('عنوان مخصص');
  });

  it('يدمج التفصيل في الرسالة', () => {
    const p = mapError(new Error('Failed to fetch'), { detail: '(محاولة 2)' });
    expect(p.message).toContain('(محاولة 2)');
  });

  it('notfound لا يطالب بإعادة المحاولة', () => {
    const p = mapError(Object.assign(new Error('not found'), { code: 'not-found' }));
    expect(p.retryable).toBe(false);
  });
});

describe('mapErrorToToast', () => {
  it('خطأ مجهول يُلحق رمز الحادثة بالنص', () => {
    const msg = mapErrorToToast(new Error('boom'));
    expect(msg).toMatch(/err_[0-9a-f]{8}/);
  });

  it('خطأ معروف لا يُثقل النص بالرمز', () => {
    expect(mapErrorToToast(new Error('Failed to fetch'))).not.toMatch(/err_/);
  });
});
