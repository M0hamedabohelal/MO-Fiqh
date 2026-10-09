import { useEffect, useRef, useState } from 'react';
import { FiVolume2, FiSquare } from 'react-icons/fi';

interface ReadAloudButtonProps {
  text: string;
}

// زر القراءة الصوتية عبر Web Speech API — مقاطع قصيرة متسلسلة لتفادي توقف كروم المبكر مع النصوص الطويلة
const CHUNK_LIMIT = 180;

function splitChunks(raw: string): string[] {
  const clean = String(raw || '')
    .replace(/[*#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!؟?])\s+/);
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + ' ' + s).trim().length > CHUNK_LIMIT && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur = `${cur} ${s}`;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

function pickArabicVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices();
    return voices.find((v) => (v.lang || '').toLowerCase().startsWith('ar')) || null;
  } catch {
    return null;
  }
}

const ReadAloudButton = ({ text }: ReadAloudButtonProps) => {
  const [speaking, setSpeaking] = useState(false);
  const activeRef = useRef(false);
  const chunksRef = useRef<string[]>([]);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const hasText = text.trim().length > 0;

  const stop = (): void => {
    activeRef.current = false;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // تجاهل
    }
    setSpeaking(false);
  };

  // إيقاف الصوت عند إزالة الزر (تغيير المسألة) حتى لا يستمر صوت مسألة قديمة
  useEffect(() => () => {
    activeRef.current = false;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // تجاهل
    }
  }, []);

  const speak = (): void => {
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // تجاهل
    }
    const chunks = splitChunks(text);
    if (chunks.length === 0) return;
    chunksRef.current = chunks;
    activeRef.current = true;
    setSpeaking(true);

    const voice = pickArabicVoice();
    let i = 0;
    const speakNext = (): void => {
      if (!activeRef.current || i >= chunksRef.current.length) {
        activeRef.current = false;
        setSpeaking(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(chunksRef.current[i]);
      u.lang = 'ar-SA';
      u.rate = 1;
      if (voice) u.voice = voice;
      i += 1;
      u.onend = () => speakNext();
      u.onerror = () => {
        activeRef.current = false;
        setSpeaking(false);
      };
      window.speechSynthesis.speak(u);
    };
    speakNext();
  };

  if (!supported || !hasText) return null;

  return (
    <button
      onClick={() => (speaking ? stop() : speak())}
      title={speaking ? 'إيقاف القراءة الصوتية' : 'استمع للمسألة صوتيًا'}
      className="btn btn-sm d-flex align-items-center gap-2 shadow-sm"
      style={{
        backgroundColor: speaking ? 'var(--primary-color)' : 'var(--badge-bg)',
        color: speaking ? 'var(--text-on-primary)' : 'var(--text-main)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        fontWeight: 'bold',
      }}
    >
      {speaking ? <FiSquare size={15} /> : <FiVolume2 size={16} />}
      {speaking ? 'إيقاف' : 'استمع للمسألة'}
    </button>
  );
};

export default ReadAloudButton;
