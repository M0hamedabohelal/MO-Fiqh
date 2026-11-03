// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import MiniAudioPlayer from './MiniAudioPlayer';
import { audioPlayerStore } from '../../utils/audioPlayerStore';

// Mock useApp context
vi.mock('../Layout/AppContext', () => ({
  useApp: () => ({
    openLessonById: vi.fn(),
    currentView: 'books',
    currentLesson: null,
  }),
}));

describe('MiniAudioPlayer Component', () => {
  beforeEach(() => {
    act(() => {
      audioPlayerStore.stop();
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('لا يصيّر شيئاً عندما لا يوجد مقطع صوتي نشط', () => {
    const { container } = render(<MiniAudioPlayer />);
    expect(container.firstChild).toBeNull();
  });

  it('يعرض معلومات المقطع وزر التشغيل عند وجود مسار نشط', () => {
    render(<MiniAudioPlayer />);

    act(() => {
      audioPlayerStore.play({
        url: 'https://example.com/audio.mp3',
        title: 'شرح كتاب الطهارة',
        chapterName: 'باب المياه',
        lessonId: '10',
      });
    });

    expect(screen.getByText('شرح كتاب الطهارة')).toBeDefined();
    expect(screen.getByText(/باب المياه/)).toBeDefined();
    expect(screen.getByRole('button', { name: /إيقاف مؤقت|تشغيل/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /إغلاق المشغل الصوتي/ })).toBeDefined();
  });

  it('يستدعي stop عند النقر على زر الإغلاق', () => {
    render(<MiniAudioPlayer />);

    act(() => {
      audioPlayerStore.play({
        url: 'https://example.com/audio.mp3',
        title: 'شرح كتاب الصلاة',
        lessonId: '20',
      });
    });

    const closeBtn = screen.getByRole('button', { name: /إغلاق المشغل الصوتي/ });
    act(() => {
      fireEvent.click(closeBtn);
    });

    expect(audioPlayerStore.getState().track).toBeNull();
  });
});
