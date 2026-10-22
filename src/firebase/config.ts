// تهيئة Firebase بشكل مؤجل (lazy) — المفاتيح من ملف .env.local
// الـ SDK لا يُحمَّل مع أول شاشة؛ يُحمَّل عند أول استدعاء فعلي لـ getFirebase()
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { AppCheck } from 'firebase/app-check';
import type * as AppMod from 'firebase/app';
import type * as FsMod from 'firebase/firestore';
import type * as AuthMod from 'firebase/auth';
import type * as AcMod from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// نتأكد إن المفاتيح موجودة — لو ناقصة التطبيق يشتغل عادي بالداتا المحلية
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

// تطبيق واحد مشترك عبر كل المسارات (initializeApp آمن للتكرار)
export function getApp(): Promise<{ app: FirebaseApp; appMod: typeof AppMod }> {
  if (!isFirebaseConfigured) {
    return Promise.reject(new Error('Firebase غير مهيأ'));
  }
  return import('firebase/app').then((appMod) => {
    const app = appMod.getApps().length > 0 ? appMod.getApps()[0] : appMod.initializeApp(firebaseConfig);
    return { app, appMod };
  });
}

let dbPromise: Promise<{ app: FirebaseApp; db: Firestore; fsMod: typeof FsMod }> | null = null;
// مسار البيانات: firestore + تهيئة الكاش المحلي (مرة واحدة)
export function getFirestore(): Promise<{ app: FirebaseApp; db: Firestore; fsMod: typeof FsMod }> {
  if (!dbPromise) {
    dbPromise = Promise.all([getApp(), import('firebase/firestore')]).then(([{ app }, fsMod]) => {
      let db: Firestore;
      try {
        // محاولة تهيئة الكاش المحلي (Offline Persistence) بحد أقصى 50 ميجابايت (52428800 بايت)
        db = fsMod.initializeFirestore(app, {
          localCache: fsMod.persistentLocalCache({ cacheSizeBytes: 52428800 }),
        });
      } catch {
        // في حال فشل الكاش أو كان مهيئاً مسبقاً، نستخدم النسخة العادية
        db = fsMod.getFirestore(app);
      }
      return { app, db, fsMod };
    });
  }
  return dbPromise;
}

// فرض إعادة اتصال Firestore.
// بعد انقطاع الشبكة قد يبقى العميل في وضع "غير متصل" إن فات حدث online (شائع في متصفحات الجوال
// على أندرويد حيث يبقى navigator.onLine=false رغم عودة الشبكة)، فلا تُرسل أي طلب ويظل
// كل تحديث يفشل بالمهلة. enableNetwork يعيد تشغيل قنوات الاتصال بغض النظر عن الحدث.
export async function enableFirestoreNetwork(): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const { db, fsMod } = await getFirestore();
    await fsMod.enableNetwork(db);
  } catch {
    // تجاهل — العملية التالية ستحاول وتفشل بوضوح إن كانت الشبكة فعلًا مقطوعة
  }
}

let authPromise: Promise<{ app: FirebaseApp; auth: Auth; authMod: typeof AuthMod }> | null = null;
// مسار المصادقة: auth فقط (يُحمَّل عند تسجيل الدخول أو فحص الجلسة)
export function getAuthModule(): Promise<{ app: FirebaseApp; auth: Auth; authMod: typeof AuthMod }> {
  if (!authPromise) {
    authPromise = Promise.all([getApp(), import('firebase/auth')]).then(([{ app }, authMod]) => ({
      app,
      auth: authMod.getAuth(app),
      authMod,
    }));
  }
  return authPromise;
}

let appCheckPromise: Promise<AppCheck> | null = null;
// ─── App Check (reCAPTCHA v3): يحمي نقاط الكتابة العامة من البوتات ───
// يُستدعى مرة واحدة عند الإقلاع (fire-and-forget) — لا يرمي أبدًا ولا يحجب التطبيق.
// بلا مفتاح (VITE_FIREBASE_APPCHECK_KEY) يُتخطى بصمت ويبقى السلوك الحالي كما هو.
// ملاحظة: التفعيل في القواعد (appCheck.token) خطوة لاحقة بعد خبز المفتاح في بناء الإنتاج
// وإلا انكسرت كتابات العملاء وسكربت SEO (بلا توكن) — لا تُفعَّل قبلها.
export function initAppCheck(): Promise<AppCheck | null> {
  if (appCheckPromise) return appCheckPromise.then((ac) => ac).catch(() => null);
  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_KEY as string | undefined;
  if (!isFirebaseConfigured || !siteKey) {
    appCheckPromise = Promise.reject(new Error('AppCheck غير مهيأ'));
    // رفض مُلتقط داخليًا — المتصلون يستخدمون void/call آمن
    appCheckPromise.catch(() => {});
    return Promise.resolve(null);
  }
  appCheckPromise = Promise.all([getApp(), import('firebase/app-check')]).then(
    ([{ app }, acMod]: [{ app: FirebaseApp }, typeof AcMod]) => {
      // وضع التطوير: توكن تصحيح من الكونسول عبر VITE_FIREBASE_APPCHECK_DEBUG_TOKEN
      // (على localhost فقط — وإلا تُرفض الطلبات عند تفعيل الإنفاذ لاحقًا)
      const host = globalThis.location?.hostname ?? '';
      if (host === 'localhost' || host === '127.0.0.1') {
        const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN as string | undefined;
        if (debugToken) {
          (globalThis as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
        }
      }
      return acMod.initializeAppCheck(app, {
        provider: new acMod.ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    },
  );
  appCheckPromise.catch(() => {});
  return appCheckPromise.catch(() => null);
}
