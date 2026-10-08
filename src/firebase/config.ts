// تهيئة Firebase بشكل مؤجل (lazy) — المفاتيح من ملف .env.local
// الـ SDK لا يُحمَّل مع أول شاشة؛ يُحمَّل عند أول استدعاء فعلي لـ getFirebase()
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type * as AppMod from 'firebase/app';
import type * as FsMod from 'firebase/firestore';
import type * as AuthMod from 'firebase/auth';

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
