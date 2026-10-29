// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Slider from './Slider';

describe('Slider Component', () => {
  afterEach(() => {
    cleanup();
  });
  const defaultProps = {
    activeView: 'books',
    setActiveView: vi.fn(),
    onOpenSearch: vi.fn(),
    onOpenLogin: vi.fn(),
    user: null,
    isAdminUser: false,
  };

  it('يعرض زرًا واحدًا مدمجًا للفوائد والمفضلة في الشريط الجانبي', () => {
    render(<Slider {...defaultProps} />);

    // التأكد من وجود الزر المدمج
    const combinedBtn = screen.getByRole('button', { name: /الفوائد والمفضلة/i });
    expect(combinedBtn).toBeTruthy();

    // التأكد من عدم وجود زرين منفصلين كما كان في السابق
    expect(screen.queryByRole('button', { name: /^المفضلة$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^الفوائد المقتبسة$/i })).toBeNull();
  });

  it('ينتقل إلى صفحة الفوائد والمفضلة عند النقر عليه', () => {
    const setActiveView = vi.fn();
    render(<Slider {...defaultProps} setActiveView={setActiveView} />);

    const combinedBtn = screen.getByRole('button', { name: /الفوائد والمفضلة/i });
    fireEvent.click(combinedBtn);

    expect(setActiveView).toHaveBeenCalledWith('highlights');
  });

  it('يظهر الزر بحالة نشطة (active) سواء كان العرض الحالي مفضلة أو فوائد', () => {
    const { rerender } = render(<Slider {...defaultProps} activeView="highlights" />);
    let combinedBtn = screen.getByRole('button', { name: /الفوائد والمفضلة/i });
    expect(combinedBtn.className).toContain('sidebar-btn-active');

    rerender(<Slider {...defaultProps} activeView="bookmarks" />);
    combinedBtn = screen.getByRole('button', { name: /الفوائد والمفضلة/i });
    expect(combinedBtn.className).toContain('sidebar-btn-active');

    rerender(<Slider {...defaultProps} activeView="books" />);
    combinedBtn = screen.getByRole('button', { name: /الفوائد والمفضلة/i });
    expect(combinedBtn.className).not.toContain('sidebar-btn-active');
  });

  it('يعرض زر الإعدادات وينتقل لصفحة الإعدادات وتظهر فئة التفعيل النشطة', () => {
    const setActiveView = vi.fn();
    const { rerender } = render(<Slider {...defaultProps} setActiveView={setActiveView} />);

    const settingsBtn = screen.getByRole('button', { name: /الإعدادات/i });
    expect(settingsBtn).toBeTruthy();
    expect(settingsBtn.className).not.toContain('sidebar-settings-active');

    fireEvent.click(settingsBtn);
    expect(setActiveView).toHaveBeenCalledWith('settings');

    rerender(<Slider {...defaultProps} activeView="settings" />);
    const activeSettingsBtn = screen.getByRole('button', { name: /الإعدادات/i });
    expect(activeSettingsBtn.className).toContain('sidebar-settings-active');
  });
});
