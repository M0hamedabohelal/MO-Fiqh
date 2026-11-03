// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audioPlayerStore, parseAudioSeconds, formatAudioTime } from './audioPlayerStore';

describe('audioPlayerStore', () => {
  beforeEach(() => {
    audioPlayerStore.stop();
  });

  it('يحول السلاسل النصية للوقت بدقة إلى ثوانٍ', () => {
    expect(parseAudioSeconds('00:30')).toBe(30);
    expect(parseAudioSeconds('02:15')).toBe(135);
    expect(parseAudioSeconds('01:00:00')).toBe(3600);
    expect(parseAudioSeconds('120')).toBe(120);
    expect(parseAudioSeconds(undefined)).toBe(0);
  });

  it('ينسق الثواني إلى عرض رقمي صحيح', () => {
    expect(formatAudioTime(30)).toBe('00:30');
    expect(formatAudioTime(135)).toBe('02:15');
    expect(formatAudioTime(3665)).toBe('1:01:05');
  });

  it('يبدأ بحالة فارغة بدون مقطع نشط', () => {
    const s = audioPlayerStore.getState();
    expect(s.track).toBeNull();
    expect(s.isPlaying).toBe(false);
  });

  it('يغير السرعة ويعلم المشتركين', () => {
    const listener = vi.fn();
    const unsub = audioPlayerStore.subscribe(listener);

    audioPlayerStore.setRate(1.5);
    expect(audioPlayerStore.getState().playbackRate).toBe(1.5);
    expect(listener).toHaveBeenCalled();

    unsub();
  });

  it('يوقف الصوت ويعيد تصفير الحالة', () => {
    audioPlayerStore.stop();
    const s = audioPlayerStore.getState();
    expect(s.track).toBeNull();
    expect(s.isPlaying).toBe(false);
    expect(s.currentTime).toBe(0);
  });
});
