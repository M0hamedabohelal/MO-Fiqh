// تهيئة Firebase بشكل مؤجل (lazy) — المفاتيح من ملف .env.local
// الـ SDK لا يُحمَّل مع أول شاشة؛ يُحمَّل عند أول استدعاء فعلي لـ getFirebase()
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
export function getApp() {
  if (!isFirebaseConfigured) {
    return Promise.reject(new Error('Firebase غير مهيأ'));
  }
  return import('firebase/app').then((appMod) => {
    const app = appMod.getApps().length > 0 ? appMod.getApps()[0] : appMod.initializeApp(firebaseConfig);
    return { app, appMod };
  });
}

let dbPromise = null;
// مسار البيانات: firestore + تهيئة الكاش المحلي (مرة واحدة)
export function getFirestore() {
  if (!dbPromise) {
    dbPromise = Promise.all([getApp(), import('firebase/firestore')]).then(([{ app }, fsMod]) => {
      let db;
      try {
        // محاولة تهيئة الكاش المحلي (Offline Persistence) بحد أقصى 10 ميجابايت (10485760 بايت)
        db = fsMod.initializeFirestore(app, {
          localCache: fsMod.persistentLocalCache({ cacheSizeBytes: 10485760 }),
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

let authPromise = null;
// مسار المصادقة: auth فقط (يُحمَّل عند تسجيل الدخول أو فحص الجلسة)
export function getAuthModule() {
  if (!authPromise) {
    authPromise = Promise.all([getApp(), import('firebase/auth')]).then(([{ app }, authMod]) => ({
      app,
      auth: authMod.getAuth(app),
      authMod,
    }));
  }
  return authPromise;
}
