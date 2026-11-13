// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import VideoCard from './VideoCard';
import { parseTime, extractVideoId, type YTPlayerInstance } from '../../utils/videoUtils';

interface MockPlayerOptions {
  videoId?: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (event?: { target?: YTPlayerInstance }) => void;
    onStateChange?: (event?: { data?: number; target?: YTPlayerInstance }) => void;
  };
}

describe('VideoCard — أدوات تحليل الوقت وروابط يوتيوب', () => {
  it('extractVideoId يستخرج المعرف من مختلف صيغ روابط يوتيوب', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('')).toBeNull();
    expect(extractVideoId(undefined)).toBeNull();
  });

  it('parseTime يحول الصيغ المختلفة (hh:mm:ss أو mm:ss أو ثوانٍ) إلى ثوانٍ بدقة', () => {
    expect(parseTime('00:05:20')).toBe(320);
    expect(parseTime('05:20')).toBe(320);
    expect(parseTime('1:02:03')).toBe(3723);
    expect(parseTime('90')).toBe(90);
    expect(parseTime('invalid')).toBe(0);
    expect(parseTime('')).toBe(0);
    expect(parseTime(undefined)).toBe(0);
  });
});

describe('VideoCard — العرض والتشغيل وحراسة الوقت الصارمة (Strict Time Guard)', () => {
  let mockPlayerInstance: {
    getCurrentTime: ReturnType<typeof vi.fn>;
    getPlayerState: ReturnType<typeof vi.fn>;
    pauseVideo: ReturnType<typeof vi.fn>;
    playVideo: ReturnType<typeof vi.fn>;
    seekTo: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    getIframe: ReturnType<typeof vi.fn>;
  };
  let playerOptions: MockPlayerOptions | null = null;

  beforeEach(() => {
    vi.useFakeTimers();

    mockPlayerInstance = {
      getCurrentTime: vi.fn().mockReturnValue(100),
      getPlayerState: vi.fn().mockReturnValue(1),
      pauseVideo: vi.fn(),
      playVideo: vi.fn(),
      seekTo: vi.fn(),
      destroy: vi.fn(),
      getIframe: vi.fn(),
    };

    function MockYTPlayer(this: YTPlayerInstance, _el: unknown, options?: MockPlayerOptions) {
      playerOptions = options || null;
      Object.assign(this, mockPlayerInstance);
      return mockPlayerInstance;
    }

    (window as unknown as { YT: unknown }).YT = {
      Player: MockYTPlayer,
      PlayerState: {
        PLAYING: 1,
        PAUSED: 2,
        ENDED: 0,
      },
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    playerOptions = null;
    delete (window as unknown as { YT?: unknown }).YT;
  });

  it('لا يعرض شيئاً إذا كان رابط الفيديو مفقوداً أو غير صالح', () => {
    const { container } = render(<VideoCard videoUrl="" />);
    expect(container.firstChild).toBeNull();
  });

  it('يعرض شارة التوقيت وزر "اسمع شرح هذه المسألة" عند توفر وقت بداية', () => {
    render(
      <VideoCard
        videoUrl="https://youtu.be/dQw4w9WgXcQ"
        startTime="00:01:30"
        endTime="00:03:00"
        title="حكم المياه"
      />
    );

    expect(screen.getByText(/اسمع شرح هذه المسألة/i)).toBeTruthy();
    expect(screen.getByText(/من/i)).toBeTruthy();
    expect(screen.getByText('00:01:30')).toBeTruthy();
    expect(screen.getByText('00:03:00')).toBeTruthy();
  });

  it('الضغط على زر الاستماع يُحمّل الـ iframe مع تفعيل enablejsapi=1 وحراسة الوقت', async () => {
    render(
      <VideoCard
        videoUrl="https://youtu.be/dQw4w9WgXcQ"
        startTime="00:01:30"
        endTime="00:03:00"
      />
    );

    const playBtn = screen.getByText(/اسمع شرح هذه المسألة/i);
    await act(async () => {
      fireEvent.click(playBtn);
      await Promise.resolve();
    });

    expect(playerOptions).toBeTruthy();
    expect(playerOptions?.videoId).toBe('dQw4w9WgXcQ');
    expect(playerOptions?.playerVars?.enablejsapi).toBe(1);
    expect(playerOptions?.playerVars?.start).toBe(90);
    expect(playerOptions?.playerVars?.end).toBe(180);
  });

  it('حراسة الوقت عند النهاية: توقف فوري وتثبيت المؤشر عند وقت النهاية إذا بلغه أو تجاوزه', async () => {
    render(
      <VideoCard
        videoUrl="https://youtu.be/dQw4w9WgXcQ"
        startTime="00:01:00" // 60s
        endTime="00:02:00"   // 120s
      />
    );

    // تفعيل التشغيل
    await act(async () => {
      fireEvent.click(screen.getByText(/اسمع شرح هذه المسألة/i));
      await Promise.resolve();
    });

    // استدعاء أحداث المشغّل بعد الربط
    expect(playerOptions).toBeTruthy();
    act(() => {
      playerOptions?.events?.onReady?.();
      playerOptions?.events?.onStateChange?.({ data: 1 });
    });

    // المشغل حالياً عند 100 ثانية (أقل من النهاية) -> لا توقف
    mockPlayerInstance.getCurrentTime.mockReturnValue(100);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(mockPlayerInstance.pauseVideo).not.toHaveBeenCalled();

    // المشغل وصل إلى 120 ثانية (وقت النهاية بالضبط) -> حزم وتوقف فوري
    mockPlayerInstance.getCurrentTime.mockReturnValue(120);
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(mockPlayerInstance.pauseVideo).toHaveBeenCalled();
    expect(mockPlayerInstance.seekTo).toHaveBeenCalledWith(120, true);

    // ظهور إشعار انتهاء المسألة وزر الإعادة
    expect(screen.getByText(/انتهى شرح هذه المسألة/i)).toBeTruthy();
    expect(screen.getByText(/إعادة المسألة/i)).toBeTruthy();
  });

  it('حراسة الوقت إذا سحب المستمع بيده لما بعد النهاية: يرجعه فوراً لوقت النهاية ويوقفه', async () => {
    render(
      <VideoCard
        videoUrl="https://youtu.be/dQw4w9WgXcQ"
        startTime="00:01:00" // 60s
        endTime="00:02:00"   // 120s
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText(/اسمع شرح هذه المسألة/i));
      await Promise.resolve();
    });

    expect(playerOptions).toBeTruthy();
    act(() => {
      playerOptions?.events?.onStateChange?.({ data: 1 });
    });

    // سحب المستخدم بيده إلى الدقيقة 10 (600 ثانية)
    mockPlayerInstance.getCurrentTime.mockReturnValue(600);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // يجب إيقافه فوراً وإرجاعه إلى 120 ثانية (وقت النهاية)
    expect(mockPlayerInstance.pauseVideo).toHaveBeenCalled();
    expect(mockPlayerInstance.seekTo).toHaveBeenCalledWith(120, true);
  });

  it('حراسة الوقت إذا سحب المستمع بيده لما قبل البداية: يعيده فوراً إلى ثانية البداية', async () => {
    render(
      <VideoCard
        videoUrl="https://youtu.be/dQw4w9WgXcQ"
        startTime="00:01:00" // 60s
        endTime="00:02:00"   // 120s
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText(/اسمع شرح هذه المسألة/i));
      await Promise.resolve();
    });

    expect(playerOptions).toBeTruthy();
    act(() => {
      playerOptions?.events?.onStateChange?.({ data: 1 });
    });

    // سحب المستخدم إلى 10 ثوانٍ (قبل البداية التي هي 60)
    mockPlayerInstance.getCurrentTime.mockReturnValue(10);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // يجب إرجاعه فوراً إلى 60 ثانية (وقت البداية)
    expect(mockPlayerInstance.seekTo).toHaveBeenCalledWith(60, true);
  });

  it('الضغط على "إعادة المسألة" يرجع المؤشر لوقت البداية ويشغّل الفيديو مجدداً', async () => {
    render(
      <VideoCard
        videoUrl="https://youtu.be/dQw4w9WgXcQ"
        startTime="00:01:00"
        endTime="00:02:00"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText(/اسمع شرح هذه المسألة/i));
      await Promise.resolve();
    });

    expect(playerOptions).toBeTruthy();
    act(() => {
      playerOptions?.events?.onStateChange?.({ data: 1 });
    });

    // بلوغ النهاية
    mockPlayerInstance.getCurrentTime.mockReturnValue(120);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const replayBtn = screen.getByText(/إعادة المسألة/i);
    expect(replayBtn).toBeTruthy();

    // الضغط على إعادة المسألة
    fireEvent.click(replayBtn);

    expect(mockPlayerInstance.seekTo).toHaveBeenCalledWith(60, true);
    expect(mockPlayerInstance.playVideo).toHaveBeenCalled();
  });

  it('عند تفكيك المكون يتم تنظيف المؤقت وتدمير المشغل', async () => {
    const { unmount } = render(
      <VideoCard
        videoUrl="https://youtu.be/dQw4w9WgXcQ"
        startTime="00:01:00"
        endTime="00:02:00"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText(/اسمع شرح هذه المسألة/i));
      await Promise.resolve();
    });

    unmount();

    expect(mockPlayerInstance.destroy).toHaveBeenCalled();
  });
});
