// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import SettingsView from './SettingsView';
import type { AppVersionState } from '../../hooks/useAppVersion';
import * as librarySync from '../../utils/librarySync';
import * as pwaHook from '../../hooks/usePWAInstall';

// Mock AppContext
const mockSetCurrentView = vi.fn();
const mockReloadFromCloud = vi.fn(async () => true);
const mockCheckAndReload = vi.fn(async () => false);
const mockReloadNow = vi.fn();

const defaultAppVersion: AppVersionState = {
  updateReady: false,
  lastCheckedAt: 123456789,
  checking: false,
  reloading: false,
  checkStatus: 'up-to-date',
  checkNow: vi.fn(async () => false),
  checkAndReload: mockCheckAndReload,
  reloadNow: mockReloadNow,
  dismiss: vi.fn(),
  dismissed: false,
  bootBuild: 'assets/index-test.js',
  runningBuild: 'assets/index-test.js',
};

let mockUser: { uid: string; email: string; displayName?: string } | null = null;
let mockAppVersion = { ...defaultAppVersion };

vi.mock('../Layout/AppContext', () => ({
  useApp: () => ({
    user: mockUser,
    setCurrentView: mockSetCurrentView,
    reloadFromCloud: mockReloadFromCloud,
    lessonsCount: 85,
    appVersion: mockAppVersion,
  }),
}));

vi.mock('../../firebase/config', () => ({
  isFirebaseConfigured: true,
  getFirestore: vi.fn(async () => ({ db: {} })),
}));

vi.mock('firebase/firestore', () => ({
  deleteDoc: vi.fn(async () => {}),
  doc: vi.fn((_db, path) => ({ path })),
}));

describe('SettingsView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockAppVersion = { ...defaultAppVersion };
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض ترويسة الصفحة والبطاقات الأساسية وروابط المطور', () => {
    render(<SettingsView />);

    expect(screen.getByText('الإعدادات وحول المنصة')).toBeTruthy();
    expect(screen.getByText(/إصدار التطبيق والتحديثات/)).toBeTruthy();
    expect(screen.getByText(/المحتوى الفقهي وقاعدة المسائل/)).toBeTruthy();
    expect(screen.getByText('إنجازاتي ومواظبتي')).toBeTruthy();
    expect(screen.getByText('طلب دعاء بظهر الغيب')).toBeTruthy();

    // التحقق من وجود روابط التواصل مع المطور
    const waLink = screen.getByTitle('محادثة واتساب مباشرة');
    expect(waLink.getAttribute('href')).toBe('https://wa.me/201093122064');
    expect(waLink.getAttribute('target')).toBe('_blank');

    const fbLink = screen.getByTitle('الملف الشخصي على فيسبوك');
    expect(fbLink.getAttribute('href')).toContain('facebook.com');

    const inLink = screen.getByTitle('الملف المهني على لينكد إن');
    expect(inLink.getAttribute('href')).toContain('linkedin.com');
  });

  it('الضغط على زر "التحقق من وجود تحديثات" يستدعي checkAndReload ويعرض رسالة نجاح', async () => {
    render(<SettingsView />);

    const checkBtn = screen.getByRole('button', { name: /التحقق من وجود تحديثات/i });
    expect(checkBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(checkBtn);
    });

    expect(mockCheckAndReload).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/تطبيقك يعمل بأحدث إصدار متوفر/)).toBeTruthy();
  });

  it('الضغط على زر "تفريغ الكاش وإعادة التشغيل" يستدعي reloadNow', async () => {
    vi.useFakeTimers();
    render(<SettingsView />);

    const purgeBtn = screen.getByRole('button', { name: /تفريغ الكاش وإعادة التشغيل/i });
    expect(purgeBtn).toBeTruthy();

    act(() => {
      fireEvent.click(purgeBtn);
    });

    // التقدم بالوقت لتنفيذ مهلة الـ 150ms
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockReloadNow).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('الضغط على زر "تحديث المحتوى والقاموس" يستدعي reloadFromCloud ويعرض تأكيد النجاح', async () => {
    render(<SettingsView />);

    const refreshContentBtn = screen.getByRole('button', { name: /تحديث المحتوى والقاموس/i });
    expect(refreshContentBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(refreshContentBtn);
    });

    expect(mockReloadFromCloud).toHaveBeenCalledWith(true);
    expect(await screen.findByText(/تم تحديث المسائل والقاموس من السحابة بنجاح/)).toBeTruthy();
  });

  it('الضغط على بطاقة "إنجازاتي ومواظبتي" ينقل المستخدم إلى شاشة الإنجازات', () => {
    render(<SettingsView />);

    const achievementsBtn = screen.getByRole('button', { name: /الانتقال إلى صفحة إنجازاتي ومواظبتي/i });
    fireEvent.click(achievementsBtn);

    expect(mockSetCurrentView).toHaveBeenCalledWith('achievements');
  });

  it('عند وجود تحديث جاهز (updateReady) يظهر زر التحديث ويستدعي reloadNow عند الضغط', () => {
    mockAppVersion = { ...defaultAppVersion, updateReady: true };
    render(<SettingsView />);

    const updateNowBtn = screen.getByRole('button', { name: /تحديث التطبيق الآن/i });
    expect(updateNowBtn).toBeTruthy();

    fireEvent.click(updateNowBtn);
    expect(mockReloadNow).toHaveBeenCalledTimes(1);
  });

  it('عند فشل تحديث المحتوى من السحابة يعرض رسالة توضح أن النسخة المحلية متاحة', async () => {
    mockReloadFromCloud.mockResolvedValueOnce(false);
    render(<SettingsView />);

    const refreshContentBtn = screen.getByRole('button', { name: /تحديث المحتوى والقاموس/i });
    await act(async () => {
      fireEvent.click(refreshContentBtn);
    });

    expect(mockReloadFromCloud).toHaveBeenCalledWith(true);
    expect(await screen.findByText(/تعذر الاتصال بالسحابة الآن؛ المحتوى المحفوظ على جهازك متاح/)).toBeTruthy();
  });

  it('الضغط على إلغاء في تأكيد مسح البيانات السحابية يغلق الصندوق دون مسح', () => {
    mockUser = { uid: 'user_123', email: 'test@example.com' };
    const syncSpy = vi.spyOn(librarySync, 'setSyncDisabled').mockImplementation(() => {});

    render(<SettingsView />);

    const clearBtn = screen.getByRole('button', { name: /مسح بياناتي السحابية/i });
    fireEvent.click(clearBtn);

    const cancelBtn = screen.getByRole('button', { name: /إلغاء/i });
    fireEvent.click(cancelBtn);

    expect(syncSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/هل ترغب فعلاً في حذف بياناتك من خوادم السحابة؟/)).toBeNull();
  });

  it('يعرض قسم الخصوصية السحابية للمستخدم المسجل ويتحكم في مسح البيانات مع التأكيد', async () => {
    mockUser = { uid: 'user_123', email: 'test@example.com' };
    const syncSpy = vi.spyOn(librarySync, 'setSyncDisabled').mockImplementation(() => {});

    render(<SettingsView />);

    // تأكد من ظهور بريد المستخدم وقسم الخصوصية
    expect(screen.getByText(/الخصوصية والمزامنة السحابية/)).toBeTruthy();
    expect(screen.getByText('test@example.com')).toBeTruthy();

    // الضغط على زر مسح بياناتي السحابية يُظهر صندوق التأكيد
    const clearBtn = screen.getByRole('button', { name: /مسح بياناتي السحابية/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText(/هل ترغب فعلاً في حذف بياناتك من خوادم السحابة؟/)).toBeTruthy();

    // تأكيد الحذف
    const confirmDeleteBtn = screen.getByRole('button', { name: /نعم، احذف من السحابة/i });
    await act(async () => {
      fireEvent.click(confirmDeleteBtn);
    });

    expect(syncSpy).toHaveBeenCalledWith('user_123', true);
    expect(await screen.findByText(/تم مسح بياناتك السحابية بنجاح/)).toBeTruthy();
  });

  it('يتيح استئناف المزامنة السحابية عندما تكون متوقفة', () => {
    mockUser = { uid: 'user_paused_123', email: 'paused@example.com' };
    vi.spyOn(librarySync, 'isSyncDisabled').mockReturnValue(true);
    const resumeSpy = vi.spyOn(librarySync, 'setSyncDisabled').mockImplementation(() => {});

    render(<SettingsView />);

    const resumeBtn = screen.getByRole('button', { name: /استئناف المزامنة السحابية/i });
    fireEvent.click(resumeBtn);

    expect(resumeSpy).toHaveBeenCalledWith('user_paused_123', false);
    expect(screen.getByText(/تمت إعادة تفعيل المزامنة السحابية بنجاح/)).toBeTruthy();
  });

  describe('بطاقة تثبيت التطبيق (PWA Install)', () => {
    it('تعرض بطاقة تثبيت التطبيق وزر التثبيت عندما لا يكون مثبتاً', () => {
      vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
        isInstallable: true,
        isInstalled: false,
        isIOS: false,
        isDismissed: false,
        promptInstall: vi.fn(),
        dismissPrompt: vi.fn(),
      });

      render(<SettingsView />);

      expect(screen.getByText('تثبيت التطبيق على جهازك')).toBeTruthy();
      expect(screen.getByRole('button', { name: /تثبيت الموقع كتطبيق/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /إرشادات التثبيت/i })).toBeTruthy();
    });

    it('النقر على زر التثبيت يستدعي promptInstall ويعرض رسالة النجاح عند القبول', async () => {
      const mockPromptInstall = vi.fn().mockResolvedValue('accepted');
      vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
        isInstallable: true,
        isInstalled: false,
        isIOS: false,
        isDismissed: false,
        promptInstall: mockPromptInstall,
        dismissPrompt: vi.fn(),
      });

      render(<SettingsView />);

      const installBtn = screen.getByRole('button', { name: /تثبيت الموقع كتطبيق/i });
      await act(async () => {
        fireEvent.click(installBtn);
      });

      expect(mockPromptInstall).toHaveBeenCalledTimes(1);
      expect(await screen.findByText(/تم تثبيت تطبيق «يَسِّر» بنجاح/)).toBeTruthy();
    });

    it('النقر على زر التثبيت يعرض رسالة إلغاء عند رفض المستخدم للمطالبة', async () => {
      const mockPromptInstall = vi.fn().mockResolvedValue('dismissed');
      vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
        isInstallable: true,
        isInstalled: false,
        isIOS: false,
        isDismissed: false,
        promptInstall: mockPromptInstall,
        dismissPrompt: vi.fn(),
      });

      render(<SettingsView />);

      const installBtn = screen.getByRole('button', { name: /تثبيت الموقع كتطبيق/i });
      await act(async () => {
        fireEvent.click(installBtn);
      });

      expect(mockPromptInstall).toHaveBeenCalledTimes(1);
      expect(await screen.findByText(/تم إلغاء التثبيت/)).toBeTruthy();
    });

    it('في أجهزة iOS: النقر على التثبيت يعرض إرشادات متصفح Safari وزر المشاركة', async () => {
      vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
        isInstallable: true,
        isInstalled: false,
        isIOS: true,
        isDismissed: false,
        promptInstall: vi.fn(),
        dismissPrompt: vi.fn(),
      });

      render(<SettingsView />);

      const installBtn = screen.getByRole('button', { name: /تثبيت الموقع كتطبيق/i });
      await act(async () => {
        fireEvent.click(installBtn);
      });

      expect(await screen.findByText(/للتثبيت على iPhone أو iPad/)).toBeTruthy();
      expect(screen.getByText(/خطوات التثبيت حسب جهازك/)).toBeTruthy();
    });

    it('عندما يكون التطبيق مثبتاً بالفعل (isInstalled=true) يعرض حالة التثبيت والزر المعطل', () => {
      vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
        isInstallable: false,
        isInstalled: true,
        isIOS: false,
        isDismissed: false,
        promptInstall: vi.fn(),
        dismissPrompt: vi.fn(),
      });

      render(<SettingsView />);

      expect(screen.getByText('التطبيق مُثبّت')).toBeTruthy();
      expect(screen.getByText('التطبيق مثبت ويعمل حالياً')).toBeTruthy();
      expect(screen.queryByRole('button', { name: /تثبيت الموقع كتطبيق/i })).toBeNull();
    });

    it('الضغط على زر إرشادات التثبيت يُظهر ويخفي صندوق الإرشادات لجميع الأجهزة', () => {
      vi.spyOn(pwaHook, 'usePWAInstall').mockReturnValue({
        isInstallable: true,
        isInstalled: false,
        isIOS: false,
        isDismissed: false,
        promptInstall: vi.fn(),
        dismissPrompt: vi.fn(),
      });

      render(<SettingsView />);

      const guideToggleBtn = screen.getByRole('button', { name: /إرشادات التثبيت/i });

      // قبل الضغط لا تظهر الإرشادات
      expect(screen.queryByText(/خطوات التثبيت حسب جهازك/)).toBeNull();

      // الضغط لفتح الإرشادات
      fireEvent.click(guideToggleBtn);
      expect(screen.getByText(/خطوات التثبيت حسب جهازك/)).toBeTruthy();
      expect(screen.getByText(/هواتف أندرويد/)).toBeTruthy();
      expect(screen.getByText(/هواتف آيفون وآيباد/)).toBeTruthy();
      expect(screen.getByText(/الكمبيوتر واللابتوب/)).toBeTruthy();

      // الضغط مرة ثانية للإخفاء
      fireEvent.click(guideToggleBtn);
      expect(screen.queryByText(/خطوات التثبيت حسب جهازك/)).toBeNull();
    });
  });
});
