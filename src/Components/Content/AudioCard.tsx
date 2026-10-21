// كارد الصوت — مشغل MP3 المستضاف بجودته الأصلية (بدون أي ضغط من طرفنا)
// سرعات تشغيل + تنزيل للاستماع أوفلاين في IndexedDB (بطلب المستخدم فقط — ويدعم القفز كاملًا)
import { useEffect, useRef, useState } from 'react';
import { FiHeadphones, FiDownload, FiCheck, FiLoader, FiTrash2 } from 'react-icons/fi';
import { saveAudio, loadAudio, removeAudio, cleanupLegacyAudioCache } from '../../utils/audioOffline';

interface AudioCardProps {
  audioUrl?: string;
  title?: string;
  // توقيتات المسألة داخل الملف الصوتي الكامل (نفس توقيتات الفيديو لو الصوت مستخرج منه)
  // — ملف واحد طويل يُستخدم لعدة مسائل بدون قص
  startTime?: string;
  endTime?: string;
}

// تحويل "mm:ss" أو "hh:mm:ss" أو ثوانٍ إلى ثوانٍ رقمية (نفس منطق VideoCard)
function parseTime(time: string | undefined): number {
  if (!time) return 0;
  const timeStr = time.toString().trim();
  if (!timeStr) return 0;
  let total = NaN;
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) total = parts[0] * 60 + parts[1];
    else if (parts.length === 3) total = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else {
    total = parseInt(timeStr, 10);
  }
  return Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0;
}

// تنسيق الثواني للعرض (2080 → 34:40)
function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

const RATES = [1, 1.25, 1.5, 2];

const AudioCard = ({ audioUrl, title, startTime, endTime }: AudioCardProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [rate, setRate] = useState(1);
  // رابط محلي (Blob) عند وجود تنزيل — يعمل أوفلاين مع قفز كامل؛ وإلا البث المباشر
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [savedMb, setSavedMb] = useState<number | null>(null);
  const cached = localUrl !== null;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const startSeconds = parseTime(startTime);
  const endSeconds = parseTime(endTime);
  // القفز لبداية المسألة مرة واحدة فقط — حتى لو فات حدث التحميل، وحتى لا نمنع الرجوع اليدوي للبداية
  const jumpedRef = useRef(false);
  const jumpToStart = (el: HTMLAudioElement | null): void => {
    if (!el || jumpedRef.current || startSeconds <= 0) return;
    // لو الموضع الحالي عند البداية المطلوبة (أو بعدها) فلا حاجة للقفز
    if (el.currentTime >= startSeconds - 2) {
      jumpedRef.current = true;
      return;
    }
    try {
      el.currentTime = startSeconds;
      jumpedRef.current = true;
    } catch { /* تجاهل */ }
  };

  // عند جاهزية الملف: اقفز لبداية المسألة — وعند بلوغ نهايتها: توقف تلقائيًا
  const handleLoadedMetadata = (): void => {
    jumpToStart(audioRef.current);
  };
  // احتياطي: لو فات حدث التحميل لأي سبب، اقفز عند أول تشغيل
  const handlePlay = (): void => {
    jumpToStart(audioRef.current);
  };
  // تنقّل المستخدم اليدوي يُلغي القفز التلقائي (حقه الرجوع للبداية إن أراد)
  const handleSeeked = (): void => {
    jumpedRef.current = true;
  };
  const handleTimeUpdate = (): void => {
    const el = audioRef.current;
    if (el && endSeconds > startSeconds && el.currentTime >= endSeconds) {
      el.pause();
    }
  };
  // ملاحظة: عند تغيّر الدرس يُعاد إنشاء المكوّن عبر key من الأب — لا حاجة لمزامنة هنا

  // المصدر: المحلي أولًا (أوفلاين + قفز كامل)، وإلا البث مع موضع البداية مُضمَّنًا (#t=)
  const localSrc = localUrl;
  const mediaSrc = localSrc ?? (
    startSeconds > 0
      ? `${audioUrl}#t=${startSeconds}${endSeconds > startSeconds ? `,${endSeconds}` : ''}`
      : audioUrl
  );

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate, mediaSrc]);

  // عند الفتح: حمّل النسخة المحلية إن وُجدت + نظّف مخزن الطريقة القديمة (مرة واحدة)
  // المكوّن مُعاد إنشاؤه لكل درس عبر key — آمن للاعتماد على audioUrl هنا
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    void cleanupLegacyAudioCache();
    if (!audioUrl) return undefined;
    void loadAudio(audioUrl).then((blob) => {
      if (!alive || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setLocalUrl(objectUrl);
      setSavedMb(Math.round((blob.size / 1048576) * 10) / 10);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!audioUrl) return null;

  // تنزيل للاستماع أوفلاين في IndexedDB (لا يُحمَّل تلقائيًا أبدًا — توفيرًا للبيانات والمساحة)
  const handleDownload = async (): Promise<void> => {
    if (!audioUrl || downloading || cached) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const res = await fetch(audioUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('تعذّر تنزيل الملف.');
      const blob = await res.blob();
      await saveAudio(audioUrl, blob);
      setLocalUrl(URL.createObjectURL(blob));
      setSavedMb(Math.round((blob.size / 1048576) * 10) / 10);
    } catch (err) {
      const msg = (err as Error).message || '';
      setDownloadError(
        msg.includes('quota') || msg.includes('Quota')
          ? 'مساحة التخزين ممتلئة — احذف تنزيلات قديمة وحاول مجددًا.'
          : 'تعذّر التنزيل — تحقق من الاتصال وحاول مجددًا.',
      );
    } finally {
      setDownloading(false);
    }
  };

  // حذف التنزيل لتحرير المساحة — يبقى البث متاحًا بالإنترنت كالمعتاد
  const handleRemoveDownload = async (): Promise<void> => {
    if (!audioUrl) return;
    await removeAudio(audioUrl);
    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl(null);
    setSavedMb(null);
  };

  return (
    <div className="custom-card p-3 p-md-4 mb-4 shadow-sm" style={{ borderRight: '4px solid var(--accent-color)' }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <FiHeadphones size={22} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
        <h6 className="fw-bold mb-0" style={{ color: 'var(--primary-color)' }}>
          🎧 استمع للدرس
        </h6>
        {title && (
          <small className="text-muted text-truncate" style={{ maxWidth: '50%' }}>
            {title}
          </small>
        )}
      </div>

      {/* الجودة = جودة الملف المرفوع (نبث الرابط الأصلي كما هو بدون تحويل) */}
      <audio
        ref={audioRef}
        controls
        preload="none"
        src={mediaSrc}
        aria-label={title ? `مشغل صوت الدرس: ${title}` : 'مشغل صوت الدرس'}
        className="w-100"
        style={{ height: '44px' }}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleLoadedMetadata}
        onPlay={handlePlay}
        onSeeked={handleSeeked}
        onTimeUpdate={handleTimeUpdate}
      />
      {startSeconds > 0 && (
        <small className="d-block mt-1 fw-bold" style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>
          ▶ يبدأ من {formatSeconds(startSeconds)}
          {endSeconds > startSeconds ? ` ويتوقف عند ${formatSeconds(endSeconds)}` : ' (موضع هذه المسألة من الملف الكامل)'}
        </small>
      )}
      {endSeconds > startSeconds && (
        <small className="text-muted d-block mt-1" style={{ fontSize: '0.78rem' }}>
          يمكنك التنقل بحرية في الملف الكامل — التوقف التلقائي عند نهاية المسألة فقط.
        </small>
      )}

      <div className="d-flex align-items-center flex-wrap gap-2 mt-3">
        <small className="text-muted fw-bold">السرعة:</small>
        <div className="d-flex gap-1" role="group" aria-label="سرعة التشغيل">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              className={`btn btn-sm ${rate === r ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ borderRadius: '8px', minWidth: '52px', fontWeight: 'bold' }}
              onClick={() => setRate(r)}
              aria-pressed={rate === r}
            >
              {r}x
            </button>
          ))}
        </div>
        <span style={{ flexGrow: 1 }} />
        {cached ? (
          <span className="d-flex align-items-center gap-2">
            <small className="d-flex align-items-center gap-1" style={{ color: '#27ae60', fontWeight: 'bold' }}>
              <FiCheck size={16} /> محفوظ أوفلاين{savedMb != null ? ` (≈ ${savedMb}MB)` : ''}
            </small>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
              style={{ borderRadius: '8px' }}
              onClick={handleRemoveDownload}
              title="حذف التنزيل لتحرير المساحة (يبقى البث بالإنترنت)"
              aria-label="حذف الصوت المحمّل"
            >
              <FiTrash2 size={14} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
            style={{ borderRadius: '8px', fontWeight: 'bold' }}
            onClick={handleDownload}
            disabled={downloading}
            title="حفظ الصوت في المتصفح للاستماع بدون إنترنت"
          >
            {downloading ? <FiLoader size={15} /> : <FiDownload size={15} />}
            {downloading ? 'جارٍ التنزيل...' : 'حمّل أوفلاين'}
          </button>
        )}
      </div>
      {downloadError && (
        <small className="text-danger d-block mt-2">{downloadError}</small>
      )}
      <small className="text-muted d-block mt-2" style={{ fontSize: '0.75rem' }}>
        يُبث بالجودة الأصلية للملف المرفوع — التنزيل يتم مرة واحدة بطلبك فقط، ويمكنك حذفه في أي وقت لتحرير المساحة.
      </small>
    </div>
  );
};

export default AudioCard;
