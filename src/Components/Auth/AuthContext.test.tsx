// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';

const mockOnAuthStateChanged = vi.fn();
const mockGetRedirectResult = vi.fn(async () => null);
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSignInWithRedirect = vi.fn();
const mockSignOut = vi.fn();
const mockCheckAdmin = vi.fn();

class MockGoogleAuthProvider {
  setCustomParameters = vi.fn();
}

vi.mock('../../firebase/config', () => ({
  isFirebaseConfigured: true,
  getAuthModule: async () => ({
    auth: { currentUser: null },
    authMod: {
      onAuthStateChanged: mockOnAuthStateChanged,
      getRedirectResult: mockGetRedirectResult,
      signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
      createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
      updateProfile: mockUpdateProfile,
      signInWithPopup: mockSignInWithPopup,
      signInWithRedirect: mockSignInWithRedirect,
      signOut: mockSignOut,
      GoogleAuthProvider: MockGoogleAuthProvider,
    },
  }),
}));

vi.mock('../../firebase/services', () => ({
  isAdmin: (...args: unknown[]) => mockCheckAdmin(...args),
}));

import { AuthProvider, useAuth } from './AuthContext';

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext & AuthProvider', () => {
  let authCallback: ((user: User | null) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authCallback = null;
    mockCheckAdmin.mockResolvedValue(false);
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      authCallback = cb;
      return () => { authCallback = null; };
    });
  });

  const renderAndReady = async () => {
    const hook = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authCallback).not.toBeNull());
    return hook;
  };

  it('يرمي استثناء عند استخدام useAuth خارج AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });

  it('يبدأ بحالة التحميل ثم يستقر عند استلام حالة المستخدم', async () => {
    const { result } = await renderAndReady();
    expect(result.current.authLoading).toBe(true);

    await act(async () => {
      authCallback?.(null);
    });

    await waitFor(() => expect(result.current.authLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAdminUser).toBe(false);
    expect(result.current.adminCheck).toBe('skipped');
  });

  it('يفحص صلاحية المشرف عند تسجيل مستخدم ويُحدّث الحالة', async () => {
    mockCheckAdmin.mockResolvedValue(true);
    const mockUser = { uid: 'admin-123', email: 'admin@example.com' } as User;

    const { result } = await renderAndReady();

    await act(async () => {
      authCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(result.current.user?.uid).toBe('admin-123');
      expect(result.current.isAdminUser).toBe(true);
      expect(result.current.adminCheck).toBe('done');
    });
    expect(mockCheckAdmin).toHaveBeenCalledWith('admin-123', expect.any(Object));
  });

  it('يحمي من تلوّث حالة المشرف عند تبديل الحساب سريعًا (حارس uid)', async () => {
    let resolveFirstAdmin: (val: boolean) => void = () => {};
    mockCheckAdmin.mockImplementationOnce(() => new Promise((resolve) => {
      resolveFirstAdmin = resolve;
    }));

    const { result } = await renderAndReady();

    // دخول مستخدم أول
    await act(async () => {
      authCallback?.({ uid: 'user-A' } as User);
    });

    // تبديل سريع لمستخدم ثانٍ قبل اكتمال فحص الأول
    mockCheckAdmin.mockResolvedValueOnce(false);
    await act(async () => {
      authCallback?.({ uid: 'user-B' } as User);
    });

    // الآن تكتمل نتيجة الفحص الأول بـ true
    await act(async () => {
      resolveFirstAdmin(true);
    });

    await waitFor(() => expect(result.current.user?.uid).toBe('user-B'));
    // يجب ألا يصبح user-B مشرفًا بسبب نتيجة user-A القديمة
    expect(result.current.isAdminUser).toBe(false);
  });

  it('تسجيل الدخول الناجح', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: 'u1' } });
    const { result } = await renderAndReady();

    await act(async () => {
      authCallback?.(null);
    });

    let res;
    await act(async () => {
      res = await result.current.login('test@example.com', 'password123');
    });

    expect(res).toEqual({ success: true });
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password123',
    );
  });

  it('تسجيل الدخول الخاطئ يعيد رسالة عربية واضحة', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/invalid-credential' });
    const { result } = await renderAndReady();

    await act(async () => {
      authCallback?.(null);
    });

    let res: { success: boolean; error?: string } | undefined;
    await act(async () => {
      res = await result.current.login('wrong@example.com', 'wrong');
    });

    expect(res?.success).toBe(false);
    expect(res?.error).toBe('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    expect(result.current.authError).toBe('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  });

  it('إنشاء حساب جديد ويُحدّث الاسم المعروض', async () => {
    const mockCreatedUser = { uid: 'u2' };
    mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockCreatedUser });
    mockUpdateProfile.mockResolvedValueOnce(undefined);

    const { result } = await renderAndReady();

    await act(async () => {
      authCallback?.(null);
    });

    let res;
    await act(async () => {
      res = await result.current.register('new@example.com', 'pass1234', 'أحمد');
    });

    expect(res).toEqual({ success: true });
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'new@example.com',
      'pass1234',
    );
    expect(mockUpdateProfile).toHaveBeenCalledWith(mockCreatedUser, { displayName: 'أحمد' });
  });

  it('تسجيل الدخول بحساب جوجل عبر Popup', async () => {
    mockSignInWithPopup.mockResolvedValueOnce({ user: { uid: 'google-uid' } });
    const { result } = await renderAndReady();

    await act(async () => {
      authCallback?.(null);
    });

    let res;
    await act(async () => {
      res = await result.current.loginWithGoogle();
    });

    expect(res).toEqual({ success: true });
    expect(mockSignInWithPopup).toHaveBeenCalled();
  });

  it('التحويل التلقائي إلى Redirect عند حجب النافذة المنبثقة', async () => {
    mockSignInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    mockSignInWithRedirect.mockResolvedValueOnce(undefined);

    const { result } = await renderAndReady();

    await act(async () => {
      authCallback?.(null);
    });

    let res;
    await act(async () => {
      res = await result.current.loginWithGoogle();
    });

    expect(res).toEqual({ success: true });
    expect(mockSignInWithRedirect).toHaveBeenCalled();
  });

  it('تسجيل الخروج يمسح أختام التزامن الخاصة بالحساب', async () => {
    mockSignOut.mockResolvedValueOnce(undefined);
    localStorage.setItem('library_stamps_v1_user-X', JSON.stringify({ 'bm:1': 100 }));

    const { result } = await renderAndReady();

    await act(async () => {
      authCallback?.({ uid: 'user-X' } as User);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(localStorage.getItem('library_stamps_v1_user-X')).toBeNull();
  });

  it('refreshAdminStatus يُحدّث حالة المشرف', async () => {
    mockCheckAdmin.mockResolvedValue(true);
    const { result } = await renderAndReady();

    await act(async () => {
      authCallback?.({ uid: 'user-Z' } as User);
    });

    let status;
    await act(async () => {
      status = await result.current.refreshAdminStatus('user-Z');
    });

    expect(status).toBe(true);
    expect(result.current.isAdminUser).toBe(true);
  });
});
