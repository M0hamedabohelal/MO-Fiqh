// سياق المصادقة — إدارة تسجيل الدخول وحالة المستخدم في كل التطبيق
// الـ SDK يُحمَّل مؤجلاً — أول شاشة لا تنتظر Firebase
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { getAuthModule, isFirebaseConfigured } from '../../firebase/config';
import { fetchUserData, isAdmin as checkAdmin } from '../../firebase/services';
import type { UserLibraryData } from '../../types';

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: User | null;
  isAdminUser: boolean;
  authLoading: boolean;
  authError: string;
  isFirebaseConfigured: boolean;
  register: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  loadUserData: (uid: string) => Promise<UserLibraryData | null>;
  refreshAdminStatus: (uid: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  // لو Firebase مش مهيأ من البداية مفيش انتظار
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [authError, setAuthError] = useState('');

  // مراقبة حالة تسجيل الدخول — بعد تحميل الـ SDK مؤجلاً
  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    let unsubscribe = () => {};
    let cancelled = false;

    getAuthModule()
      .then(async ({ auth, authMod }) => {
        if (cancelled) return;

        // ✅ معالجة نتيجة Google Redirect عند العودة للتطبيق
        try {
          const result = await authMod.getRedirectResult(auth);
          if (result?.user && !cancelled) {
            // تم تسجيل الدخول بنجاح عبر Google Redirect
            setAuthError('');
          }
        } catch (redirectErr) {
          if (!cancelled) {
            const msg = translateAuthError(errCode(redirectErr, 'auth/network-request-failed'));
            setAuthError(msg);
          }
        }

        unsubscribe = authMod.onAuthStateChanged(auth, async (firebaseUser: User | null) => {
          setUser(firebaseUser);
          if (firebaseUser) {
            const adminStatus = await checkAdmin(firebaseUser.uid);
            if (!cancelled) setIsAdminUser(adminStatus);
          } else if (!cancelled) {
            setIsAdminUser(false);
          }
          if (!cancelled) setAuthLoading(false);
        });
      })
      .catch(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
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

      // محاولة Popup أولاً (أفضل تجربة في المتصفح العادي)
      // في حالة الفشل (مثل PWA أو متصفح مقيد) ننتقل لـ Redirect
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
          // ملاحظة: مع Redirect الصفحة ستُغلق وتُفتح جوجل ثم تعود
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

  // تسجيل خروج
  const logout = useCallback(async () => {
    const { auth, authMod } = await getAuthModule();
    await authMod.signOut(auth);
  }, []);

  // جلب بيانات المستخدم من Firestore (المفضلة والفوائد والملاحظات)
  const loadUserData = useCallback(async (uid: string): Promise<UserLibraryData | null> => {
    if (!isFirebaseConfigured || !uid) return null;
    try {
      return await fetchUserData(uid);
    } catch {
      return null;
    }
  }, []);

  // إعادة فحص صلاحية المشرف
  const refreshAdminStatus = useCallback(async (uid: string): Promise<boolean> => {
    if (!uid) return false;
    const status = await checkAdmin(uid);
    setIsAdminUser(status);
    return status;
  }, []);

  const value = {
    user,
    isAdminUser,
    authLoading,
    authError,
    isFirebaseConfigured,
    register,
    login,
    loginWithGoogle,
    logout,
    loadUserData,
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

export default AuthContext;
