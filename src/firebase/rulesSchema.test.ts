// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// اختبارات فحص تطابق نصي ومحاكاة منطقية لمخطط قواعد Firestore مع بيانات العميل.
// تنبيه للشفافية: هذا فحص تطابق نصوص ومحاكاة منطقية للقيود (Contract Verification)
// وليس اختبارًا رسميًا عبر محاكي Firestore Emulator (@firebase/rules-unit-testing).

describe('Firestore Rules — فحص تطابق نصي ومحاكاة منطقية لعقد المخطط', () => {
  const rulesContent = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

  it('ملف firestore.rules موجود ويحتوي على النسخة 2 ومسارات المزامنة', () => {
    expect(rulesContent).toContain("rules_version = '2'");
    expect(rulesContent).toContain('match /users/{uid}/data/library');
    expect(rulesContent).toContain('match /users/{uid}/data/announcementReads');
    expect(rulesContent).toContain('match /client_errors/{docId}');
    expect(rulesContent).toContain('match /lessons/{docId}');
  });

  // محاكي قواعد Firestore لمستند المكتبة (Users Library Rules Evaluator)
  const evaluateLibraryRule = (
    authUid: string | null,
    targetUid: string,
    data: Record<string, unknown>,
  ): { allowed: boolean; reason?: string } => {
    if (!authUid || authUid !== targetUid) {
      return { allowed: false, reason: 'unauthorized_uid' };
    }

    const allowedKeys = new Set(['bookmarks', 'highlights', 'notes', 'readLessons', 'stopMarks', 'theme', 'updatedAt']);
    for (const k of Object.keys(data)) {
      if (!allowedKeys.has(k)) return { allowed: false, reason: `disallowed_key_${k}` };
    }

    if (!Array.isArray(data.bookmarks) || data.bookmarks.length > 3000) {
      return { allowed: false, reason: 'invalid_bookmarks' };
    }
    if (!Array.isArray(data.readLessons) || data.readLessons.length > 3000) {
      return { allowed: false, reason: 'invalid_readLessons' };
    }
    if (!Array.isArray(data.highlights) || data.highlights.length > 3000) {
      return { allowed: false, reason: 'invalid_highlights' };
    }
    if (!data.notes || typeof data.notes !== 'object' || Array.isArray(data.notes) || Object.keys(data.notes).length > 2000) {
      return { allowed: false, reason: 'invalid_notes' };
    }
    if (!data.updatedAt || typeof data.updatedAt !== 'object' || Array.isArray(data.updatedAt) || Object.keys(data.updatedAt).length > 12000) {
      return { allowed: false, reason: 'invalid_updatedAt' };
    }
    if ('stopMarks' in data) {
      if (!data.stopMarks || typeof data.stopMarks !== 'object' || Array.isArray(data.stopMarks) || Object.keys(data.stopMarks).length > 200) {
        return { allowed: false, reason: 'invalid_stopMarks' };
      }
    }
    if ('theme' in data) {
      if (typeof data.theme !== 'string') {
        return { allowed: false, reason: 'invalid_theme' };
      }
    }

    return { allowed: true };
  };

  it('حالة إيجابية: حمولة المكتبة الافتراضية للعميل تُقبل بنجاح في القواعد', () => {
    const validClientPayload = {
      bookmarks: ['1', '2', '3'],
      readLessons: ['10'],
      highlights: [{ id: 'hl-1', text: 'فائدة فقهية', lessonId: '1' }],
      notes: { '1': 'ملاحظة على المسألة' },
      stopMarks: { 'book-1': { lessonId: '1', updatedAt: Date.now() } },
      theme: 'dark',
      updatedAt: { 'bm:1': Date.now(), 'read:10': Date.now() },
    };

    const result = evaluateLibraryRule('user-123', 'user-123', validClientPayload);
    expect(result.allowed).toBe(true);
  });

  it('حالة سلبية: رفض كتابة مستخدم لحساب مستخدم آخر', () => {
    const validPayload = {
      bookmarks: [],
      readLessons: [],
      highlights: [],
      notes: {},
      updatedAt: {},
    };

    const result = evaluateLibraryRule('attacker', 'victim', validPayload);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('unauthorized_uid');
  });

  it('حالة سلبية: رفض الحقول الغريبة وغير المصرح بها (hasOnly guard)', () => {
    const maliciousPayload = {
      bookmarks: [],
      readLessons: [],
      highlights: [],
      notes: {},
      updatedAt: {},
      injectedField: 'malicious data',
    };

    const result = evaluateLibraryRule('user-123', 'user-123', maliciousPayload);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('disallowed_key_injectedField');
  });

  it('حالة سلبية: رفض تجاوز سقف المفضلة (أكثر من 3000)', () => {
    const oversizedPayload = {
      bookmarks: new Array(3001).fill('bm'),
      readLessons: [],
      highlights: [],
      notes: {},
      updatedAt: {},
    };

    const result = evaluateLibraryRule('user-123', 'user-123', oversizedPayload);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('invalid_bookmarks');
  });

  it('حالة سلبية: رفض تجاوز سقف الأختام الزمنية updatedAt (أكثر من 12000)', () => {
    const oversizedStamps: Record<string, number> = {};
    for (let i = 0; i < 12001; i++) {
      oversizedStamps[`key_${i}`] = 123456;
    }

    const oversizedPayload = {
      bookmarks: [],
      readLessons: [],
      highlights: [],
      notes: {},
      updatedAt: oversizedStamps,
    };

    const result = evaluateLibraryRule('user-123', 'user-123', oversizedPayload);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('invalid_updatedAt');
  });

  // محاكي إشعارات القراءة (announcementReads)
  const evaluateAnnouncementReadsRule = (
    authUid: string | null,
    targetUid: string,
    data: Record<string, unknown>,
  ): boolean => {
    if (!authUid || authUid !== targetUid) return false;
    const keys = Object.keys(data);
    if (keys.some((k) => k !== 'items' && k !== 'updatedAt')) return false;
    if (!Array.isArray(data.items) || data.items.length > 500) return false;
    if (typeof data.updatedAt !== 'number') return false;
    return true;
  };

  it('حالة إيجابية: مقروء الإشعارات المطابق للعميل يُقبل في القواعد', () => {
    const valid = { items: ['ann-1', 'ann-2'], updatedAt: Date.now() };
    expect(evaluateAnnouncementReadsRule('u1', 'u1', valid)).toBe(true);
  });

  it('حالة سلبية: رفض مقروء إشعارات يتجاوز 500 عنصر', () => {
    const invalid = { items: new Array(501).fill('id'), updatedAt: Date.now() };
    expect(evaluateAnnouncementReadsRule('u1', 'u1', invalid)).toBe(false);
  });
});
