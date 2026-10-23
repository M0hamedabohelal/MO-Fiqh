// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isFatalFirestoreError,
  recoverFromFatalFirestoreError,
  firestoreFatalRecovery,
  __resetRecoveryForTests,
} from './firestoreRecovery';

describe('isFatalFirestoreError', () => {
  it('يكتشف تأكيدات ca9 وb815 حتى لو كانت متداخلة داخل رسالة أخرى', () => {
    expect(
      isFatalFirestoreError(
        new Error('FIRESTORE (12.18.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9) CONTEXT: {"M":-1}'),
      ),
    ).toBe(true);
    expect(
      isFatalFirestoreError(
        'CONTEXT: {"el":"Error: FIRESTORE (12.18.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9)"}',
      ),
    ).toBe(true);
    expect(isFatalFirestoreError(new Error('FIRESTORE INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)'))).toBe(true);
  });

  // شكل العطل المنشور على الإنتاج: b815 مغلّفًا alc_context الذي يحمل ca9 داخله
  it('يكتشف b815 المغلَّف داخل CONTEXT الذي يحمل ca9', () => {
    expect(
      isFatalFirestoreError(
        new Error(
          'FIRESTORE (12.18.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: ' +
            '{"el":"Error: FIRESTORE (12.18.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9) CONTEXT: {\\"M\\":-1,\\"targetId\\":1004}"}',
        ),
      ),
    ).toBe(true);
  });

  it('يتجاهل الأخطاء العادية وأرقام التأكيدات الأخرى', () => {
    expect(isFatalFirestoreError(new Error('network-request-failed'))).toBe(false);
    expect(isFatalFirestoreError(undefined)).toBe(false);
    expect(isFatalFirestoreError(null)).toBe(false);
    expect(isFatalFirestoreError(new Error('INTERNAL ASSERTION FAILED: Unexpected state (ID: 1234)'))).toBe(false);
  });

  // العلة الجذرية: queue يفشل مرة واحدة فيبقى فاشلًا — كل enqueueThrow لاحق
  // يرمي b815 جديدًا. لذلك لا بد أن يُكتشف أي b815 حتى لو كان failure أصلًا.
  it('يكتشف التكرار المتسلسل (كل call جديد بعد فشل الطابور يرمي b815)', () => {
    const repeated = new Error(
      'FIRESTORE (12.18.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: {"messageOrStack":"Error: ... ca9 ..."}',
    );
    expect(isFatalFirestoreError(repeated)).toBe(true);
  });
});

// هذا هو العطل المنشور: الخطأ وصل ErrorBoundary (تصيير)، لا window.error.
// الحماية السابقة كانت تُرجع true بلا إعادة تحميل فتبقى شاشة الخطأ للأبد.
describe('firestoreFatalRecovery — مسار التصيير', () => {
  const fatal = () => new Error('INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)');
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    __resetRecoveryForTests();
    sessionStorage.clear();
    reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('يعيد التحميل عند أول عطل قاتل', async () => {
    await firestoreFatalRecovery(fatal());
    expect(reload).toHaveBeenCalledTimes(1);
  });

  // الحالة التي أسقطت المستخدم: جلسة سبق فيها تسجيل عطل، فدخلت في نافذة الحماية.
  it('يعيد التحميل حتى لو كان عطلًا سابقًا داخل نافذة الحماية (لا شاشة خطأ دائمة)', async () => {
    sessionStorage.setItem('firestore_assertion_reload_at', String(Date.now()));
    await firestoreFatalRecovery(fatal());
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يتجاهل الخطأ غير القاتل', async () => {
    await firestoreFatalRecovery(new Error('network-request-failed'));
    expect(reload).not.toHaveBeenCalled();
  });

  it('لا يعيد التحميل مرتين لعطلين متزامنين', async () => {
    await Promise.all([firestoreFatalRecovery(fatal()), firestoreFatalRecovery(fatal())]);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('recoverFromFatalFirestoreError — مسار window', () => {
  const fatal = () => new Error('INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)');
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    __resetRecoveryForTests();
    sessionStorage.clear();
    reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('يعيد التحميل ويبلغ true عند العطل القاتل', () => {
    expect(recoverFromFatalFirestoreError(fatal())).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('لا يعيد التحميل للخطأ غير القاتل', () => {
    expect(recoverFromFatalFirestoreError(new Error('network-request-failed'))).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
