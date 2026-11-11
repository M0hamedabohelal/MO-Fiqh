// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastProvider } from './ToastProvider';
import { useToast } from './useToast';
import { ConfirmProvider } from './ConfirmProvider';
import { useConfirm } from './useConfirm';

// شاشة E1: تظهر بلا stack trace، تحمل رمز حادثة، وتُخفي تفاصيل الملفات عن المستخدم.
// الإشعارات: تحل محل alert، وتحترم حدّ 3 رسائل، وتُعلن لقارئ الشاشة.

// لا يوجد setup file عام لهذا المشروع: نُنظّف يدويًا وإلا تسرّبت الشجرة بين الاختبارات
afterEach(() => cleanup());

const Boom = () => {
  throw new Error('render exploded at /src/Components/Thing.tsx:42');
};

describe('ErrorBoundary (E1)', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sessionStorage.clear();
  });
  afterEach(() => consoleSpy.mockRestore());

  it('يعرض عنوان الخطأ ورمز حادثة ولا يعرض stack/message', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('heading', { level: 2, name: /تعذّر عرض هذه الشاشة/ })).toBeTruthy();
    expect(screen.getByText(/err_[0-9a-f]{8}/)).toBeTruthy();
    expect(document.body.textContent).not.toContain('render exploded');
    expect(document.body.textContent).not.toContain('Thing.tsx');
  });

  it('التفاصيل تُسجَّل مع رمز الحادثة نفسه', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    const shown = document.querySelector('.error-state-code')?.textContent?.trim() ?? '';
    const logged = consoleSpy.mock.calls.map((c: unknown[]) => String(c[0])).join(' ');
    expect(logged).toContain(shown);
  });

  it('زر إعادة المحاولة يعيد محاولة التصيير بدل reload كامل', () => {
    let shouldThrow = true;
    const Flaky = () => {
      if (shouldThrow) throw new Error('first try fails');
      return <p>محتوى سليم</p>;
    };
    render(<ErrorBoundary><Flaky /></ErrorBoundary>);
    expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeTruthy();
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }));
    expect(screen.getByText('محتوى سليم')).toBeTruthy();
  });
});

function Toaster() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast.error('لم يتم النسخ')}>فتح خطأ</button>
      <button type="button" onClick={() => toast.success('تم النسخ')}>فتح نجاح</button>
    </>
  );
}

describe('ToastProvider', () => {
  it('يظهر الخطأ بدور alert والنجاح بدور status', () => {
    render(<ToastProvider><Toaster /></ToastProvider>);
    fireEvent.click(screen.getByText('فتح خطأ'));
    expect(screen.getByRole('alert').textContent).toContain('لم يتم النسخ');
    fireEvent.click(screen.getByText('فتح نجاح'));
    expect(screen.getByText('تم النسخ').closest('[role="status"]')).toBeTruthy();
  });

  it('لا يتجاوز 3 رسائل معروضة', () => {
    render(<ToastProvider><Toaster /></ToastProvider>);
    const btn = screen.getByText('فتح خطأ');
    fireEvent.click(btn);
    fireEvent.click(screen.getByText('فتح نجاح'));
    fireEvent.click(screen.getByText('فتح نجاح'));
    fireEvent.click(screen.getByText('فتح خطأ'));
    expect(document.querySelectorAll('.toast-item').length).toBeLessThanOrEqual(3);
  });

  it('الإغلاق اليدوي يزيل الرسالة', () => {
    render(<ToastProvider><Toaster /></ToastProvider>);
    fireEvent.click(screen.getByText('فتح خطأ'));
    fireEvent.click(screen.getByRole('button', { name: /إغلاق الإشعار/ }));
    expect(document.querySelectorAll('.toast-item').length).toBe(0);
  });

  it('خارج المزوّد لا يرمي (مكوّن معزول)', () => {
    expect(() => render(<Toaster />)).not.toThrow();
  });
});

function ConfirmHarness() {
  const confirm = useConfirm();
  const [first, setFirst] = useState('pending');
  const [second, setSecond] = useState('pending');
  return (
    <>
      <button type="button" onClick={() => { void confirm({ title: 'الأول' }).then((ok) => setFirst(ok ? 'ok' : 'cancelled')); }}>
        افتح الأول
      </button>
      <button type="button" onClick={() => { void confirm({ title: 'الثاني' }).then((ok) => setSecond(ok ? 'ok' : 'cancelled')); }}>
        افتح الثاني
      </button>
      <output data-testid="first">{first}</output>
      <output data-testid="second">{second}</output>
    </>
  );
}

describe('ConfirmProvider', () => {
  afterEach(() => cleanup());

  // طلب جديد أثناء حوار مفتوح كان يترك وعد الطلب الأول معلّقًا للأبد.
  it('طلب جديد يحسم السابق بـ«إلغاء» ويعرض الجديد', async () => {
    render(<ConfirmProvider><ConfirmHarness /></ConfirmProvider>);

    fireEvent.click(screen.getByText('افتح الأول'));
    expect(screen.getByRole('alertdialog')).toBeTruthy();

    fireEvent.click(screen.getByText('افتح الثاني'));

    await waitFor(() => expect(screen.getByTestId('first').textContent).toBe('cancelled'));
    expect(screen.getByRole('heading', { level: 2, name: 'الثاني' })).toBeTruthy();
    expect(screen.getByTestId('second').textContent).toBe('pending');

    fireEvent.click(screen.getByRole('button', { name: /تأكيد/ }));
    await waitFor(() => expect(screen.getByTestId('second').textContent).toBe('ok'));
  });
});
