// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerHaptic } from './haptics';

describe('triggerHaptic utility', () => {
  const originalVibrate = window.navigator.vibrate;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: originalVibrate,
      configurable: true,
      writable: true,
    });
  });

  it('calls navigator.vibrate with correct durations for each style', () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    });

    triggerHaptic('selection');
    expect(vibrateMock).toHaveBeenCalledWith(8);

    triggerHaptic('light');
    expect(vibrateMock).toHaveBeenCalledWith(12);

    triggerHaptic('medium');
    expect(vibrateMock).toHaveBeenCalledWith(20);

    triggerHaptic('success');
    expect(vibrateMock).toHaveBeenCalledWith([12, 40, 16]);
  });

  it('gracefully handles missing vibrate API without error', () => {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(() => triggerHaptic('light')).not.toThrow();
  });

  it('catches and ignores vibrate errors if permission denied', () => {
    const vibrateMock = vi.fn().mockImplementation(() => {
      throw new Error('NotAllowedError');
    });
    Object.defineProperty(window.navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    });

    expect(() => triggerHaptic('light')).not.toThrow();
  });
});
