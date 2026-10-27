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

vi.mock('../Layout/AppContext', () => ({
  useApp: () => ({
    isOffline: false,
  }),
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
});
