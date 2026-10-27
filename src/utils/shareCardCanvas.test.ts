// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateShareCanvas } from './shareCardCanvas';

describe('generateShareCanvas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      quadraticCurveTo: vi.fn(),
      arc: vi.fn(),
    });

    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockImage');
  });

  it('generates a canvas element with expected default width and calculated height', () => {
    const canvas = generateShareCanvas('المسألة الأولى', 'نص المسألة الفقهية');
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBeGreaterThan(0);
  });

  it('handles optional sheikh comment and increases height accordingly', () => {
    const canvasWithout = generateShareCanvas('المسألة الأولى', 'نص المسألة');
    const canvasWith = generateShareCanvas('المسألة الأولى', 'نص المسألة', 'تعليق تفصيلي من الشيخ');

    expect(canvasWith.height).toBeGreaterThan(canvasWithout.height);
  });

  it('cleans special quotes and handles multi-paragraph text', () => {
    const textWithQuotes = '﴿قال الله تعالى﴾ و {حديث نبوي} و «أثر فقهي»\nفقرة ثانية مستقلة';
    const canvas = generateShareCanvas('عنوان الاختبار', textWithQuotes);
    expect(canvas).toBeDefined();
    expect(canvas.toDataURL('image/png')).toBe('data:image/png;base64,mockImage');
  });

  it('caps max lines when text exceeds limit', () => {
    const longText = Array(250).fill('سطر طويل جداً لتجاوز الحد الأقصى').join('\n');
    const canvas = generateShareCanvas('مسألة طويلة جداً', longText);
    expect(canvas).toBeDefined();
    expect(canvas.height).toBeGreaterThan(0);
  });
});
