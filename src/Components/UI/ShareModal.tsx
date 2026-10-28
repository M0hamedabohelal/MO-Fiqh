import { useState } from 'react';
import { FiX, FiShare2, FiDownload, FiCopy, FiCheck } from 'react-icons/fi';
import { FaWhatsapp, FaTelegram, FaXTwitter } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';
import { copyText } from '../../utils/clipboard';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cleanUrl: string;
  shareText: string;
  onDownloadImage: () => void;
}

const ShareModal = ({
  isOpen,
  onClose,
  title,
  cleanUrl,
  shareText,
  onDownloadImage,
}: ShareModalProps) => {
  const [copiedFull, setCopiedFull] = useState(false);

  const handleWhatsAppShare = () => {
    const msg = encodeURIComponent(`${shareText}\n\n🔗 ${cleanUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramShare = () => {
    const urlParam = encodeURIComponent(cleanUrl);
    const textParam = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?url=${urlParam}&text=${textParam}`, '_blank', 'noopener,noreferrer');
  };

  const handleXShare = () => {
    const shortText = shareText.length > 200 ? `${shareText.slice(0, 190)}...` : shareText;
    const urlParam = encodeURIComponent(cleanUrl);
    const textParam = encodeURIComponent(shortText);
    window.open(`https://twitter.com/intent/tweet?text=${textParam}&url=${urlParam}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyFull = async () => {
    const fullContent = `${shareText}\n\n🔗 ${cleanUrl}`;
    const ok = await copyText(fullContent);
    setCopiedFull(ok);
    setTimeout(() => setCopiedFull(false), 2200);
  };

  const handleNativeShareDirect = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: cleanUrl,
        });
        onClose();
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('تعذر استدعاء مشاركة النظام:', err);
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3"
          style={{ zIndex: 1060, backgroundColor: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="custom-card p-4 shadow-lg text-end parchment-texture"
            style={{
              width: '100%',
              maxWidth: '430px',
              borderRadius: '20px',
              border: '1.5px solid var(--accent-color, #c9a84c)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-25">
              <div className="d-flex align-items-center gap-2">
                <span className="badge badge-custom px-2 py-1" style={{ fontSize: '0.85rem' }}>
                  <FiShare2 className="ms-1" size={13} /> مشاركة
                </span>
                <span className="fw-bold text-truncate" style={{ color: 'var(--primary-color)', maxWidth: '240px' }}>
                  {title}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '30px', height: '30px' }}
                onClick={onClose}
                title="إغلاق"
                aria-label="إغلاق"
              >
                <FiX size={16} />
              </button>
            </div>

            <p className="text-muted small mb-3 text-center" style={{ lineHeight: '1.7' }}>
              اختر الوسيلة المفضلة لمشاركة المسألة أو نسخ الرابط والنص مباشرة:
            </p>

            <div className="d-flex flex-column gap-2 mb-3">
              {/* واتساب */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="btn d-flex align-items-center justify-content-between p-2 px-3 shadow-sm"
                style={{
                  backgroundColor: '#25D366',
                  color: '#fff',
                  borderRadius: '12px',
                  fontWeight: 600,
                  border: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="d-flex align-items-center gap-2">
                  <FaWhatsapp size={20} />
                  <span>مشاركة عبر واتساب (WhatsApp)</span>
                </span>
                <span className="badge bg-white bg-opacity-25 small">إرسال ↗</span>
              </button>

              {/* تليجرام */}
              <button
                type="button"
                onClick={handleTelegramShare}
                className="btn d-flex align-items-center justify-content-between p-2 px-3 shadow-sm"
                style={{
                  backgroundColor: '#229ED9',
                  color: '#fff',
                  borderRadius: '12px',
                  fontWeight: 600,
                  border: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="d-flex align-items-center gap-2">
                  <FaTelegram size={20} />
                  <span>مشاركة عبر تليجرام (Telegram)</span>
                </span>
                <span className="badge bg-white bg-opacity-25 small">إرسال ↗</span>
              </button>

              {/* إكس / تويتر */}
              <button
                type="button"
                onClick={handleXShare}
                className="btn d-flex align-items-center justify-content-between p-2 px-3 shadow-sm"
                style={{
                  backgroundColor: '#000',
                  color: '#fff',
                  borderRadius: '12px',
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="d-flex align-items-center gap-2">
                  <FaXTwitter size={18} />
                  <span>نشر على منصة إكس (X)</span>
                </span>
                <span className="badge bg-white bg-opacity-25 small">نشر ↗</span>
              </button>

              {/* نسخ النص والرابط */}
              <button
                type="button"
                onClick={handleCopyFull}
                className="btn d-flex align-items-center justify-content-between p-2 px-3 shadow-sm"
                style={{
                  backgroundColor: copiedFull ? '#27ae60' : 'var(--badge-bg)',
                  color: copiedFull ? '#fff' : 'var(--text-main)',
                  borderRadius: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="d-flex align-items-center gap-2">
                  {copiedFull ? <FiCheck size={18} /> : <FiCopy size={18} />}
                  <span>{copiedFull ? 'تم نسخ النص والرابط!' : 'نسخ نص المسألة مع الرابط'}</span>
                </span>
                <span className="badge bg-secondary bg-opacity-25 small">{copiedFull ? '✓ تم' : 'نسخ'}</span>
              </button>

              {/* مشاركة عبر نافذة النظام */}
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  type="button"
                  onClick={handleNativeShareDirect}
                  className="btn d-flex align-items-center justify-content-between p-2 px-3 shadow-sm"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--primary-color)',
                    borderRadius: '12px',
                    fontWeight: 600,
                    border: '1px dashed var(--primary-color)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span className="d-flex align-items-center gap-2">
                    <FiShare2 size={18} />
                    <span>نافذة مشاركة النظام الأصلية</span>
                  </span>
                  <span className="badge bg-secondary bg-opacity-25 small">النظام</span>
                </button>
              )}
            </div>

            {/* حفظ كصورة مصممة */}
            <div className="pt-2 border-top border-secondary border-opacity-10 d-flex justify-content-between align-items-center">
              <span className="text-muted small">تريد حفظها كبطاقة؟</span>
              <button
                type="button"
                onClick={() => {
                  onDownloadImage();
                  onClose();
                }}
                className="btn btn-sm d-inline-flex align-items-center gap-1"
                style={{
                  borderRadius: '20px',
                  border: '1.5px solid var(--primary-color)',
                  color: 'var(--primary-color)',
                  backgroundColor: 'transparent',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                <FiDownload size={14} /> حفظ كصورة
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareModal;
