// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { User } from 'firebase/auth';

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockLogout = vi.fn();

let mockAuthState: {
  user: User | null;
  authError: string;
  isFirebaseConfigured: boolean;
} = {
  user: null,
  authError: '',
  isFirebaseConfigured: true,
};

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthState.user,
    authError: mockAuthState.authError,
    isFirebaseConfigured: mockAuthState.isFirebaseConfigured,
    login: mockLogin,
    register: mockRegister,
    loginWithGoogle: mockLoginWithGoogle,
    logout: mockLogout,
  }),
}));

import LoginModal from './LoginModal';

describe('LoginModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      user: null,
      authError: '',
      isFirebaseConfigured: true,
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('لا يُصيّر أي شيء عندما يكون isOpen = false', () => {
    const { container } = render(<LoginModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('يعرض شاشة تسجيل الدخول الافتراضية مع الحقول المطلوبة', () => {
    render(<LoginModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('🔐 تسجيل الدخول')).toBeTruthy();
    expect(screen.getByPlaceholderText('البريد الإلكتروني')).toBeTruthy();
    expect(screen.getByPlaceholderText('كلمة المرور (6 حروف على الأقل)')).toBeTruthy();
    expect(screen.getByText('المتابعة بحساب Google')).toBeTruthy();
  });

  it('يُرسل نموذج تسجيل الدخول ويستدعي onSuccess و onClose عند النجاح', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(<LoginModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('البريد الإلكتروني'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('كلمة المرور (6 حروف على الأقل)'), { target: { value: 'password123' } });

    const submitBtn = screen.getByRole('button', { name: /^دخول$/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123');
      expect(onClose).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('التبديل إلى وضع إنشاء حساب يُظهر حقل الاسم والعنوان الجديد', async () => {
    mockRegister.mockResolvedValueOnce({ success: true });
    const onClose = vi.fn();

    render(<LoginModal isOpen={true} onClose={onClose} />);

    const switchBtn = screen.getByText('ليس لديك حساب؟ أنشئ حساباً جديداً');
    fireEvent.click(switchBtn);

    expect(screen.getByText('✨ إنشاء حساب جديد')).toBeTruthy();
    expect(screen.getByPlaceholderText('اسمك (اختياري)')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('اسمك (اختياري)'), { target: { value: 'سعيد' } });
    fireEvent.change(screen.getByPlaceholderText('البريد الإلكتروني'), { target: { value: 'said@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('كلمة المرور (6 حروف على الأقل)'), { target: { value: '12345678' } });

    const registerSubmitBtn = screen.getByRole('button', { name: /إنشاء الحساب/i });
    fireEvent.click(registerSubmitBtn);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('said@example.com', '12345678', 'سعيد');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('الضغط على تسجيل الدخول بـ Google', async () => {
    mockLoginWithGoogle.mockResolvedValueOnce({ success: true });
    const onClose = vi.fn();

    render(<LoginModal isOpen={true} onClose={onClose} />);

    const googleBtn = screen.getByText('المتابعة بحساب Google');
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('يعرض شاشة المستخدم المسجل مع زر تسجيل الخروج', async () => {
    mockAuthState.user = {
      uid: 'user-77',
      email: 'salem@example.com',
      displayName: 'سالم',
    } as User;
    mockLogout.mockResolvedValueOnce(undefined);
    const onClose = vi.fn();

    render(<LoginModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText('👤 حسابك')).toBeTruthy();
    expect(screen.getByText('salem@example.com')).toBeTruthy();
    expect(screen.getByText('سالم')).toBeTruthy();

    const logoutBtn = screen.getByRole('button', { name: /تسجيل الخروج/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('الضغط على زر الإغلاق يستدعي onClose', () => {
    const onClose = vi.fn();
    render(<LoginModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText('إغلاق نافذة الدخول');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
