// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import AdminGlossaryTab from './AdminGlossaryTab';
import * as services from '../../firebase/services';

vi.mock('../../firebase/services', () => ({
  saveTerm: vi.fn(async () => {}),
  deleteTerm: vi.fn(async () => {}),
}));

describe('AdminGlossaryTab Component', () => {
  const mockOnDataChanged = vi.fn(async () => true);
  const mockFlash = vi.fn();

  const sampleGlossary = {
    'الطهور': 'الماء الطاهر في ذاته المطهر لغيره',
    'النجاسة': 'كل عين مستقذرة أمر الشارع باجتنابها',
  };

  const sampleLessons = [
    {
      id: 1,
      title: 'المسألة الأولى: الماء الطهور',
      mainText: 'الماء الطهور طاهر مطهر',
      sheikhExplanation: 'والطهور لا ينجس إلا بالتغير',
      bookName: 'كتاب الطهارة',
      chapterName: 'باب المياه',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض قائمة المصطلحات وحقول الإضافة وشريط البحث بنجاح', () => {
    render(
      <AdminGlossaryTab
        glossary={sampleGlossary}
        lessons={sampleLessons}
        onDataChanged={mockOnDataChanged}
        flash={mockFlash}
      />
    );

    expect(screen.getByText('إضافة مصطلح جديد')).toBeTruthy();
    expect(screen.getByPlaceholderText('المصطلح')).toBeTruthy();
    expect(screen.getByPlaceholderText('التعريف')).toBeTruthy();
    expect(screen.getByPlaceholderText('ابحث في المصطلحات والتعريفات...')).toBeTruthy();

    expect(screen.getByText('الطهور:')).toBeTruthy();
    expect(screen.getByText('الماء الطاهر في ذاته المطهر لغيره')).toBeTruthy();
    expect(screen.getByText('النجاسة:')).toBeTruthy();
  });

  it('البحث يقوم بتصفية المصطلحات فورياً', () => {
    render(
      <AdminGlossaryTab
        glossary={sampleGlossary}
        lessons={sampleLessons}
        onDataChanged={mockOnDataChanged}
        flash={mockFlash}
      />
    );

    const searchInput = screen.getByPlaceholderText('ابحث في المصطلحات والتعريفات...');
    fireEvent.change(searchInput, { target: { value: 'نجاسة' } });

    expect(screen.getByText('النجاسة:')).toBeTruthy();
    expect(screen.queryByText('الطهور:')).toBeNull();
  });

  it('إضافة مصطلح جديد تستدعي saveTerm و onDataChanged وتظهر رسالة نجاح', async () => {
    render(
      <AdminGlossaryTab
        glossary={sampleGlossary}
        lessons={sampleLessons}
        onDataChanged={mockOnDataChanged}
        flash={mockFlash}
      />
    );

    const termInput = screen.getByPlaceholderText('المصطلح');
    const defInput = screen.getByPlaceholderText('التعريف');
    const addBtn = screen.getByRole('button', { name: /إضافة للمصطلحات/i });

    fireEvent.change(termInput, { target: { value: 'التيمم' } });
    fireEvent.change(defInput, { target: { value: 'مسح الوجه واليدين بالصعيد الطيب' } });

    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(services.saveTerm).toHaveBeenCalledWith('التيمم', 'مسح الوجه واليدين بالصعيد الطيب');
      expect(mockFlash).toHaveBeenCalledWith('success', expect.stringContaining('التيمم'));
      expect(mockOnDataChanged).toHaveBeenCalled();
    });
  });

  it('يمنع حفظ مصطلح يحتوي على شرطة مائلة (/)', async () => {
    render(
      <AdminGlossaryTab
        glossary={sampleGlossary}
        lessons={sampleLessons}
        onDataChanged={mockOnDataChanged}
        flash={mockFlash}
      />
    );

    const termInput = screen.getByPlaceholderText('المصطلح');
    const defInput = screen.getByPlaceholderText('التعريف');
    const addBtn = screen.getByRole('button', { name: /إضافة للمصطلحات/i });

    fireEvent.change(termInput, { target: { value: 'طهور/طاهر' } });
    fireEvent.change(defInput, { target: { value: 'تعريف تجريبي' } });

    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(services.saveTerm).not.toHaveBeenCalled();
      expect(mockFlash).toHaveBeenCalledWith('error', expect.stringContaining('الشرطة المائلة'));
    });
  });

  it('تعديل مصطلح يفتح حقل التعديل ويحفظ التحديث بنجاح', async () => {
    render(
      <AdminGlossaryTab
        glossary={sampleGlossary}
        lessons={sampleLessons}
        onDataChanged={mockOnDataChanged}
        flash={mockFlash}
      />
    );

    const editBtn = screen.getByLabelText('تعديل مصطلح الطهور');
    fireEvent.click(editBtn);

    const textarea = screen.getByDisplayValue('الماء الطاهر في ذاته المطهر لغيره');
    expect(textarea).toBeTruthy();

    fireEvent.change(textarea, { target: { value: 'تعريف محدث' } });

    const saveBtn = screen.getByRole('button', { name: /حفظ/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(services.saveTerm).toHaveBeenCalledWith('الطهور', 'تعريف محدث');
      expect(mockFlash).toHaveBeenCalledWith('success', expect.stringContaining('الطهور'));
      expect(mockOnDataChanged).toHaveBeenCalled();
    });
  });

  it('حذف مصطلح يطلب تأكيداً ثم يستدعي deleteTerm و onDataChanged', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <AdminGlossaryTab
        glossary={sampleGlossary}
        lessons={sampleLessons}
        onDataChanged={mockOnDataChanged}
        flash={mockFlash}
      />
    );

    const deleteBtn = screen.getByLabelText('حذف مصطلح الطهور');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('الطهور'));

    await waitFor(() => {
      expect(services.deleteTerm).toHaveBeenCalledWith('الطهور');
      expect(mockFlash).toHaveBeenCalledWith('success', expect.stringContaining('الطهور'));
      expect(mockOnDataChanged).toHaveBeenCalled();
    });
  });

  it('يحسب مطابقات المسائل بالخلفية بشكل غير متزامن ويعيد استخدام الكاش عند إعادة الفتح', async () => {
    const { unmount } = render(
      <AdminGlossaryTab
        glossary={sampleGlossary}
        lessons={sampleLessons}
        onDataChanged={mockOnDataChanged}
        flash={mockFlash}
      />
    );

    // التحقق من ظهور شارات التطابق للمصطلحات بعد انتهاء الحساب في الخلفية
    await waitFor(() => {
      expect(screen.getAllByText(/تطابق/).length).toBeGreaterThan(0);
    });

    unmount();

    // إعادة التركيب (remount) لمحاكاة التنقل بين تبويبات الإدارة
    render(
      <AdminGlossaryTab
        glossary={sampleGlossary}
        lessons={sampleLessons}
        onDataChanged={mockOnDataChanged}
        flash={mockFlash}
      />
    );

    // تظهر الشارات فورًا من الكاش دون أي انتظار أو تجميد
    expect(screen.getAllByText(/تطابق/).length).toBeGreaterThan(0);
  });
});
