// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AdminPanel from './AdminPanel';

const mockReloadFromCloud = vi.fn(async () => true);

vi.mock('../Layout/AppContext', () => ({
  useApp: () => ({
    lessons: [{ id: 1, title: 'المسألة الأولى' }],
    glossary: { 'الطهور': 'الماء الباقي على خلقته' },
    cloudLessonsLoaded: true,
    cloudStatus: 'ready',
    isOffline: false,
    reloadFromCloud: mockReloadFromCloud,
  }),
}));

vi.mock('./AdminLessonsTab', () => ({
  default: () => <div data-testid="admin-lessons-tab">Lessons Tab Content</div>,
}));

vi.mock('./AdminGlossaryTab', () => ({
  default: () => <div data-testid="admin-glossary-tab">Glossary Tab Content</div>,
}));

vi.mock('./AdminStatsTab', () => ({
  default: () => <div data-testid="admin-stats-tab">Stats Tab Content</div>,
}));

vi.mock('./AdminAnnouncements', () => ({
  default: () => <div data-testid="admin-announcements-tab">Announcements Tab Content</div>,
}));

describe('AdminPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('يعرض ترويسة لوحة الإدارة والتبويبات الافتراضية مع الأعداد', () => {
    render(<AdminPanel />);

    expect(screen.getByText('لوحة الإدارة')).toBeTruthy();
    expect(screen.getByText(/المسائل \(1\)/)).toBeTruthy();
    expect(screen.getByText(/القاموس \(1\)/)).toBeTruthy();
    expect(screen.getByText(/الإحصائيات/)).toBeTruthy();
    expect(screen.getByText(/التنبيهات/)).toBeTruthy();
    expect(screen.getByTestId('admin-lessons-tab')).toBeTruthy();
  });

  it('التبديل بين التبويبات يُظهر المحتوى المطابق', () => {
    render(<AdminPanel />);

    // التبديل إلى القاموس
    fireEvent.click(screen.getByText(/القاموس/));
    expect(screen.getByTestId('admin-glossary-tab')).toBeTruthy();
    expect(screen.queryByTestId('admin-lessons-tab')).toBeNull();

    // التبديل إلى الإحصائيات
    fireEvent.click(screen.getByText(/الإحصائيات/));
    expect(screen.getByTestId('admin-stats-tab')).toBeTruthy();

    // التبديل إلى التنبيهات
    fireEvent.click(screen.getByText(/التنبيهات/));
    expect(screen.getByTestId('admin-announcements-tab')).toBeTruthy();
  });

  it('الضغط على زر تحديث البيانات من السحابة يستدعي reloadFromCloud', async () => {
    render(<AdminPanel />);

    const refreshBtn = screen.getByText('تحديث البيانات من السحابة');
    expect(refreshBtn).toBeTruthy();

    fireEvent.click(refreshBtn);
    expect(mockReloadFromCloud).toHaveBeenCalled();
  });
});
