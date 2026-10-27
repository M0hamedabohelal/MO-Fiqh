// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// السبب الجذري لعطل b815 على الإنتاج: enableNetwork يُستدعى مرات متتالية بلا
// disableNetwork بينها فيفسد pendingResponses (يصبح -1) → ca9 → يموت الطابور → b815.
// المرجع: firebase-js-sdk#9968 (أُعيد إنتاجه بنفس جدول الاستدعاءات).
// هذه الاختبارات تثبّت سياسة الاستدعاء، لا سلوك SDK نفسه.

const enableNetwork = vi.fn(async () => {});
const disableNetwork = vi.fn(async () => {});

vi.mock('firebase/firestore', () => ({
  enableNetwork,
  disableNetwork,
  // getFirestore() في config.ts يهيّئ كاشًا دائمًا؛ بلا هذين يرمي فيُبتلع الخطأ
  // وتبدو الشبكة "غير مهيّأة" فيسقط الاختبار بلا سبب واضح.
  initializeFirestore: () => ({ __db: true }),
  persistentLocalCache: () => ({ __cache: true }),
  getDocs: vi.fn(),
  getDocsFromServer: vi.fn(),
  onSnapshot: vi.fn(),
  clearIndexedDbPersistence: vi.fn(async () => {}),
}));

vi.mock('firebase/app', () => ({
  getApps: () => [{}],
  initializeApp: () => ({}),
  getApp: () => ({}),
}));

vi.mock('firebase/auth', () => ({ getAuth: () => ({}) }));
vi.mock('firebase/app-check', () => ({ initializeAppCheck: () => ({}) }));

// نُهيّئ isFirebaseConfigured عبر متغيرات البيئة بدل mock الموديول نفسه
// (mock ذاتي لوحدة قيد الاستيراد يترك الدوال الحقيقية غير مربوطة).
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
vi.stubEnv('VITE_FIREBASE_APP_ID', 'test-app-id');

import {
  enableFirestoreNetwork,
  disableFirestoreNetwork,
  __resetNetworkStateForTests,
  initAppCheck,
} from './config';

describe('enableFirestoreNetwork — سياسة إعادة الاتصال', () => {
  beforeEach(() => {
    __resetNetworkStateForTests();
    enableNetwork.mockClear();
    disableNetwork.mockClear();
  });

  it('لا يستدعي SDK وهو متصل أصلًا (تكرار النداء هو ما يفسد العميل)', async () => {
    await enableFirestoreNetwork();
    await enableFirestoreNetwork();
    await enableFirestoreNetwork();
    expect(enableNetwork).not.toHaveBeenCalled();
  });

  it('يستدعي SDK مرة واحدة فقط بعد انقطاع معلن', async () => {
    await disableFirestoreNetwork();
    await enableFirestoreNetwork();
    expect(disableNetwork).toHaveBeenCalledTimes(1);
    expect(enableNetwork).toHaveBeenCalledTimes(1);
  });

  it('يستدعي SDK مرة واحدة فقط حتى مع نداءات متتالية بعد الانقطاع', async () => {
    await disableFirestoreNetwork();
    await Promise.all([
      enableFirestoreNetwork(),
      enableFirestoreNetwork(),
      enableFirestoreNetwork(),
    ]);
    expect(enableNetwork).toHaveBeenCalledTimes(1);
  });

  it('لا يعيد الاتصال أكثر من مرة بعد عودة الاتصال (نداءات متتالية عبر دورات)', async () => {
    await disableFirestoreNetwork();
    await enableFirestoreNetwork();
    // عودة ثانية بلا انقطاع جديد: يجب ألا تُلمس SDK
    await enableFirestoreNetwork();
    expect(enableNetwork).toHaveBeenCalledTimes(1);
  });
});

describe('initAppCheck — السلوك الآمن وحماية الإقلاع', () => {
  it('يعيد null بصمت ولا يرمي أي استثناء عند غياب مفتاح reCAPTCHA', async () => {
    const res = await initAppCheck();
    expect(res).toBeNull();
  });
});
