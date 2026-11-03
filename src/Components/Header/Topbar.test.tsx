// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Topbar from './Topbar';

vi.mock('../../hooks/useAnnouncements', () => ({
  useAnnouncements: () => ({
    announcements: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockUseApp = vi.fn(() => ({
  isOffline: false,
  isAdminUser: false,
  currentView: 'books',
  currentLesson: undefined as unknown,
  openAdminEditLesson: vi.fn(),
}));

vi.mock('../Layout/AppContext', () => ({
  useApp: () => mockUseApp(),
}));

describe('Topbar — Theme Navigation & Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('displays dark theme label and transitions to sepia when clicked', () => {
    const mockToggleTheme = vi.fn();
    render(<Topbar theme="dark" toggleTheme={mockToggleTheme} />);

    const themeBtn = screen.getByRole('button', { name: /تبديل المظهر.*داكن/i });
    expect(themeBtn).toBeDefined();
    expect(screen.getByText('داكن')).toBeDefined();

    fireEvent.click(themeBtn);
    expect(mockToggleTheme).toHaveBeenCalledWith('sepia');
  });

  it('displays sepia theme label and transitions to light when clicked', () => {
    const mockToggleTheme = vi.fn();
    render(<Topbar theme="sepia" toggleTheme={mockToggleTheme} />);

    const themeBtn = screen.getByRole('button', { name: /تبديل المظهر.*تراثي/i });
    expect(screen.getByText('تراثي')).toBeDefined();

    fireEvent.click(themeBtn);
    expect(mockToggleTheme).toHaveBeenCalledWith('light');
  });

  it('displays light theme label and transitions back to dark when clicked', () => {
    const mockToggleTheme = vi.fn();
    render(<Topbar theme="light" toggleTheme={mockToggleTheme} />);

    const themeBtn = screen.getByRole('button', { name: /تبديل المظهر.*فاتح/i });
    expect(themeBtn).toBeDefined();
    expect(screen.getByText('فاتح')).toBeDefined();

    fireEvent.click(themeBtn);
    expect(mockToggleTheme).toHaveBeenCalledWith('dark');
  });

  it('يعرض زر تعديل المسألة برقم ID للأدمن فقط عند تصفح المسألة ويستدعي openAdminEditLesson', () => {
    const mockOpenEdit = vi.fn();
    mockUseApp.mockReturnValue({
      isOffline: false,
      isAdminUser: true,
      currentView: 'reading',
      currentLesson: { id: 7, title: 'المسألة السابعة' } as unknown,
      openAdminEditLesson: mockOpenEdit,
    });

    render(<Topbar theme="dark" toggleTheme={vi.fn()} />);

    const editBtn = screen.getByRole('button', { name: /تعديل المسألة رقم 7/i });
    expect(editBtn).toBeTruthy();
    expect(screen.getByText('مسألة #7')).toBeTruthy();

    fireEvent.click(editBtn);
    expect(mockOpenEdit).toHaveBeenCalledWith(7);
  });

  it('لا يعرض زر تعديل المسألة للمستخدم العادي (غير الأدمن)', () => {
    mockUseApp.mockReturnValue({
      isOffline: false,
      isAdminUser: false,
      currentView: 'reading',
      currentLesson: { id: 7, title: 'المسألة السابعة' } as unknown,
      openAdminEditLesson: vi.fn(),
    });

    render(<Topbar theme="dark" toggleTheme={vi.fn()} />);
    expect(screen.queryByText(/مسألة #/)).toBeNull();
  });
});
