// سياق المصادقة — إدارة تسجيل الدخول وحالة المستخدم في كل التطبيق
// الـ SDK يُحمَّل مؤجلاً — أول شاشة لا تنتظر Firebase
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { getAuthModule, isFirebaseConfigured } from '../../firebase/config';
import { isAdmin as checkAdmin } from '../../firebase/services';
import { safeRemove } from '../../utils/safeStorage';

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: User | null;
  isAdminUser: boolean;
  // حالة فحص صلاحية المشرف — 'pending' حتى تصل إجابة مؤكدة من الخادم
  adminCheck: 'pending' | 'done' | 'skipped';
  authLoading: boolean;
  authError: string;
  isFirebaseConfigured: boolean;
  register: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshAdminStatus: (uid: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const isStandaloneDisplay = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
    const isIosStandalone = (navigator as unknown as { standalone?: boolean })?.standalone === true;
    const isAndroidApp = typeof document !== 'undefined' && typeof document.referrer === 'string' && document.referrer.includes('android-app://');
    return Boolean(isStandaloneDisplay || isIosStandalone || isAndroidApp);
  } catch {
    return false;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminCheck, setAdminCheck] = useState<'pending' | 'done' | 'skipped'>(
    isFirebaseConfigured ? 'pending' : 'skipped',
  );
  // مرجع آخر uid فعّال — يمنع نتيجة فحص مشرف متأخرة لحساب سابق من تلويث حالة الحساب الجديد
  const currentUidRef = useRef<string | null>(null);
  // لو Firebase مش مهيأ من البداية مفيش انتظار
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [authError, setAuthError] = useState('');

  // مراقبة حالة تسجيل الدخول — بعد تحميل الـ SDK مؤجلاً
  // تراجع أسّي لفحص المشرف: التهيئة الباردة/التوكن المتأخر في Firestore كان يجعل الفحص
  // يفشل فورًا فيُعلن المستخدم غير مشرف (لوحة الإدارة لا تظهر نهائيًا) حتى إعادة التحميل.
  const adminRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminAttemptRef = useRef(0);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    let unsubscribe = () => {};
    let cancelled = false;

    const clearAdminRetry = () => {
      if (adminRetryRef.current) {
        clearTimeout(adminRetryRef.current);
        adminRetryRef.current = null;
      }
    };

    // يفحص الصلاحية ويُعيد المحاولة بتراجع أسّي ما دامت النتيجة غير مؤكدة (فشل شبكة/توكن).
    // يُكفّ عن المحاولة عند إجابة مؤكدة، أو تغيّر الحساب، أو مغادرة الجلسة.
    // المحاولة الأولى من الكاش (آمنة على عميل بارد)؛ المحاولات التالية من الخادم
    // لتكشف كاشًا قديمًا يرفض الصلاحية بعد منحها في الكونسول.
    const runAdminCheck = (uid: string) => {
      const attempt = () => {
        const fromServer = adminAttemptRef.current > 0;
        void checkAdmin(uid, { server: fromServer }).then((result) => {
          if (cancelled || currentUidRef.current !== uid) return;
          // 'unknown' = فشل تقييم وليس رفضًا: نحاول مرة أخرى بدل تثبيت false
          if (result === 'unknown') {
            adminAttemptRef.current += 1;
            const delay = Math.min(2_000 * 2 ** (adminAttemptRef.current - 1), 20_000);
            adminRetryRef.current = setTimeout(attempt, delay);
            return;
          }
          // رفض من الكاش = محتمل أن يكون قديمًا: جولة خادم واحدة قبل الحسم
          if (result === false && !fromServer) {
            adminAttemptRef.current += 1;
            adminRetryRef.current = setTimeout(attempt, 1_200);
            return;
          }
          clearAdminRetry();
          setIsAdminUser(result);
          setAdminCheck('done');
        });
      };
      attempt();
    };

    getAuthModule()
      .then(({ auth, authMod }) => {
        if (cancelled) return;

        // اشترك أولًا: استعادة الحساب المخزّن لا تنتظر فحص نتيجة Google Redirect.
        // getRedirectResult قد يتأخر على الشبكة؛ تشغيله بالخلفية يمنع تعليق شاشة البداية.
        unsubscribe = authMod.onAuthStateChanged(auth, (firebaseUser: User | null) => {
          setUser(firebaseUser);
          currentUidRef.current = firebaseUser?.uid ?? null;
          // لا نحجب التطبيق على فحص المشرف (رحلة شبكة كاملة) — يُفحص في الخلفية
          // وتبويب الإدارة يظهر فور وصول النتيجة؛ المكتبة والمحتوى يبدآن فورًا
          if (!cancelled) setAuthLoading(false);
          clearAdminRetry();
          adminAttemptRef.current = 0;
          if (firebaseUser) {
            const uidAtCheck = firebaseUser.uid;
            // إعادة تعيين فورية تمنع ظهور تبويب الإدارة خطأً أثناء فحص الحساب الجديد
            setIsAdminUser(false);
            setAdminCheck('pending');
            runAdminCheck(uidAtCheck);
          } else {
            setIsAdminUser(false);
            setAdminCheck('skipped');
          }
        });

        // ✅ معالجة نتيجة Google Redirect عند العودة للتطبيق، دون حجب استعادة الجلسة.
        void authMod.getRedirectResult(auth)
          .then((result) => {
            if (result?.user && !cancelled) {
              setUser(result.user);
              currentUidRef.current = result.user.uid;
              setAuthError('');
            }
          })
          .catch((redirectErr: unknown) => {
            if (!cancelled) {
              const msg = translateAuthError(errCode(redirectErr, 'auth/network-request-failed'));
              setAuthError(msg);
            }
          });
      })
      .catch(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
      clearAdminRetry();
      unsubscribe();
    };
  }, []);

  // إنشاء حساب جديد
  const register = useCallback(async (email: string, password: string, displayName?: string): Promise<AuthResult> => {
    setAuthError('');
    try {
      const { auth, authMod } = await getAuthModule();
      const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await authMod.updateProfile(cred.user, { displayName });
      }
      return { success: true };
    } catch (err) {
      const message = translateAuthError(errCode(err));
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  // تسجيل دخول
  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setAuthError('');
    try {
      const { auth, authMod } = await getAuthModule();
      await authMod.signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err) {
      const message = translateAuthError(errCode(err));
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  // تسجيل دخول بحساب جوجل
  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    setAuthError('');
    try {
      const { auth, authMod } = await getAuthModule();
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // في أجهزة الجوال أو التطبيق المثبت (PWA / Standalone):
      // النوافذ المنبثقة (Popup) في المتصفحات النقالة وWebAPK تفقد اتصال النافذة الأم (window.opener)
      // وتؤدي لإعادة تشغيل التطبيق في الخلفية كضيف وضياع الجلسة.
      // لذلك نستخدم signInWithRedirect وفق معايير Firebase الرسمية؛
      // وبفضل ضبط authDomain على نفس النطاق (fqh.me)، يظل التوجيه داخل الـ PWA وتلتقطه getRedirectResult فوراً.
      if (isMobileDevice() || isStandalone()) {
        await authMod.signInWithRedirect(auth, provider);
        return { success: true };
      }

      // محاولة Popup أولاً (أفضل تجربة في المتصفح العادي على الكمبيوتر)
      // في حالة الفشل (متصفح مقيّد أو نافذة محجوبة) ننتقل لـ Redirect
      try {
        const result = await authMod.signInWithPopup(auth, provider);
        if (result?.user) {
          return { success: true };
        }
        return { success: true };
      } catch (popupErr) {
        // أخطاء تستوجب التحويل لـ Redirect
        // ملاحظة: إغلاق المستخدم للنافذة بنفسه ليس فشلًا تقنيًا — يُعرض كرسالة إلغاء بدل سحبه لتدفق Redirect كامل
        const redirectCodes = [
          'auth/popup-blocked',
          'auth/cancelled-popup-request',
          'auth/operation-not-supported-in-this-environment',
        ];
        if (redirectCodes.includes(errCode(popupErr))) {
          // استخدام Redirect كبديل
          await authMod.signInWithRedirect(auth, provider);
          // النتيجة ستُعالج في useEffect عبر getRedirectResult
          return { success: true };
        }
        throw popupErr;
      }
    } catch (err) {
      const message = translateAuthError(errCode(err, 'auth/network-request-failed'));
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  // تسجيل خروج — لا يرمي أبدًا حتى لا يعلق المتصل به (النافذة تُغلق دائمًا)
  const logout = useCallback(async () => {
    try {
      const currentUid = currentUidRef.current;
      const { auth, authMod } = await getAuthModule();
      await authMod.signOut(auth);
      if (currentUid) {
        safeRemove(`library_stamps_v1_${currentUid}`);
      }
    } catch (err) {
      console.error('فشل تسجيل الخروج:', err);
    }
  }, []);

  // إعادة فحص صلاحية المشرف
  // 'unknown' = فشل تقييم (شبكة/توكن) وليس رفضًا: لا نمسّ الحالة الحالية،
  // وإلا اختفت لوحة الإدارة عند كل فشل عابر ثم عادت في المحاولة التالية (وميض).
  const refreshAdminStatus = useCallback(async (uid: string): Promise<boolean> => {
    if (!uid) return false;
    const status = await checkAdmin(uid);
    if (status === 'unknown') return false;
    // لا تلوّث حالة حساب جديد إن تغيّر المستخدم أثناء الفحص
    if (currentUidRef.current === uid) {
      setIsAdminUser(status);
      setAdminCheck('done');
    }
    return status;
  }, []);

  const value = {
    user,
    isAdminUser,
    adminCheck,
    authLoading,
    authError,
    isFirebaseConfigured,
    register,
    login,
    loginWithGoogle,
    logout,
    refreshAdminStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ترجمة أخطاء Firebase لرسائل عربية مفهومة
function errCode(err: unknown, fallback = ''): string {
  return (err as { code?: string })?.code ?? fallback;
}

function translateAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مستخدم بالفعل، جرّب تسجيل الدخول.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة — يجب ألا تقل عن 6 حروف.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة خاطئة — انتظر قليلاً ثم حاول مرة أخرى.';
    case 'auth/network-request-failed':
      return 'مشكلة في الاتصال بالإنترنت — تحقق من شبكتك.';
    case 'auth/unauthorized-domain':
      return 'نطاق التطبيق غير مضاف في قائمة النطاقات المصرّح بها (Authorized Domains) في Firebase.';
    case 'auth/popup-blocked':
      return 'تم حجب النافذة المنبثقة — يرجى السماح بالنوافذ المنبثقة للمتابعة.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بالبريد غير مفعّل في مشروع Firebase.';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة تسجيل الدخول — حاول مرة أخرى.';
    case 'auth/account-exists-with-different-credential':
      return 'هذا البريد مرتبط بطريقة تسجيل دخول مختلفة، جرّب البريد وكلمة المرور.';
    default:
      return 'حدث خطأ غير متوقع — حاول مرة أخرى.';
  }
}
