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

let firebasePromise = null;

// تحميل الـ SDK والتهيئة مرة واحدة فقط — يعيد { app, auth, db, authMod, fsMod }
export function getFirebase() {
  if (!isFirebaseConfigured) {
    return Promise.reject(new Error('Firebase غير مهيأ'));
  }
  if (!firebasePromise) {
    firebasePromise = Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ])
      .then(([appMod, authMod, fsMod]) => {
        const app = appMod.getApps().length > 0 ? appMod.getApps()[0] : appMod.initializeApp(firebaseConfig);
        return {
          app,
          auth: authMod.getAuth(app),
          db: fsMod.getFirestore(app),
          authMod,
          fsMod,
        };
      })
      .catch((err) => {
        // فشل التحميل — نسمح بإعادة المحاولة لاحقاً
        firebasePromise = null;
        throw err;
      });
  }
  return firebasePromise;
}
