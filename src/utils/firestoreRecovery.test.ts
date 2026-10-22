import { describe, it, expect } from 'vitest';
import { isFatalFirestoreError } from './firestoreRecovery';

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

  it('يتجاهل الأخطاء العادية وأرقام التأكيدات الأخرى', () => {
    expect(isFatalFirestoreError(new Error('network-request-failed'))).toBe(false);
    expect(isFatalFirestoreError(undefined)).toBe(false);
    expect(isFatalFirestoreError(null)).toBe(false);
    expect(isFatalFirestoreError(new Error('INTERNAL ASSERTION FAILED: Unexpected state (ID: 1234)'))).toBe(false);
  });
});
