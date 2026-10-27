import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

// اختبار قواعد Firestore الحقيقية عبر محاكي القواعد
// يتحقق من:
// 1. القراءة العامة للمسائل (/lessons/{id})
// 2. رفض كتابة المستخدم العادي أو الزائر على المسائل
// 3. خصوصية بيانات المستخدم (/users/{uid}/data/library) — المالك يكتب والمستخدم الآخر يُرفض
// 4. رفض الحقول غير المصرح بها في مستند المكتبة

const PROJECT_ID = 'fqh-rules-test';
const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

const isEmulatorRunning = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.runIf(isEmulatorRunning)('Firestore Security Rules — Emulator Live Suite', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  it('المحتوى العام: القراءة مسموحة للجميع (زائر بلا مصادقة)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const docRef = unauthedDb.collection('lessons').doc('lesson-1');
    await assertSucceeds(docRef.get());
  });

  it('حماية المحتوى: رفض إنشاء أو تعديل المسائل لغير المشرفين', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const docRef = unauthedDb.collection('lessons').doc('lesson-hack');
    await assertFails(docRef.set({ title: 'اختراق' }));

    const userDb = testEnv.authenticatedContext('user_123').firestore();
    await assertFails(userDb.collection('lessons').doc('lesson-user').set({ title: 'تعديل مستخدم' }));
  });

  it('بيانات المستخدم: المالك يستطيع كتابة وقراءة مكتبته الخاصة', async () => {
    const userDb = testEnv.authenticatedContext('user_alice').firestore();
    const myLibrary = userDb.collection('users').doc('user_alice').collection('data').doc('library');

    const validPayload = {
      bookmarks: ['1', '2'],
      readLessons: ['1'],
      highlights: [],
      notes: { '1': 'ملاحظة صحيحة' },
      updatedAt: { '1': Date.now() },
    };

    await assertSucceeds(myLibrary.set(validPayload));
    await assertSucceeds(myLibrary.get());
  });

  it('عزل المستخدمين: مستخدم آخر يُمنع تمامًا من قراءة أو كتابة بيانات غيره', async () => {
    const bobDb = testEnv.authenticatedContext('user_bob').firestore();
    const aliceLibrary = bobDb.collection('users').doc('user_alice').collection('data').doc('library');

    await assertFails(aliceLibrary.get());
    await assertFails(aliceLibrary.set({ bookmarks: ['99'] }));
  });

  it('تقييد المخطط: رفض أي حقل غير مصرح به داخل مستند المكتبة', async () => {
    const userDb = testEnv.authenticatedContext('user_charlie').firestore();
    const myLibrary = userDb.collection('users').doc('user_charlie').collection('data').doc('library');

    const payloadWithInvalidKey = {
      bookmarks: ['1'],
      readLessons: ['1'],
      highlights: [],
      notes: {},
      updatedAt: {},
      malicious_extra_field: 'hacked',
    };

    await assertFails(myLibrary.set(payloadWithInvalidKey));
  });
});

// اختبار احتياطي عند عدم تشغيل المحاكي لتوضيح الحالة
describe.skipIf(isEmulatorRunning)('Firestore Security Rules — تنبيه بيئة المحاكي', () => {
  it('لتشغيل اختبارات Emulator الحقيقية اضبط FIRESTORE_EMULATOR_HOST أو نفّذ npm run test:rules', () => {
    expect(true).toBe(true);
  });
});
