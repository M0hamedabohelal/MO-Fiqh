import { useState } from 'react';
import { FiImage, FiFileText } from 'react-icons/fi';

interface MediaCardProps {
  mediaUrl?: string;
  mediaType?: string;
  title?: string;
}

const MediaCard = ({ mediaUrl, mediaType, title }: MediaCardProps) => {
  const [showMedia, setShowMedia] = useState(false);
  if (!mediaUrl) return null;

  return (
    <div className="custom-card p-4 mt-4 text-center">
      <h3 className="h5 mb-3 fw-bold" style={{ color: 'var(--primary-color)' }}>
        {mediaType === 'pdf' ? (
          <><FiFileText className="ms-2" /> مرفق PDF</>
        ) : (
          <><FiImage className="ms-2" /> صورة مرفقة</>
        )}
      </h3>
      
      {mediaType === 'image' ? (
        !showMedia ? (
          <button type="button" className="btn btn-outline-primary" onClick={() => setShowMedia(true)}>
            تحميل الصورة وعرضها
          </button>
        ) : (
          <img
            src={mediaUrl}
            alt={title ? `صورة مرفقة لمسألة: ${title}` : 'صورة مرفقة للمسألة'}
            loading="lazy"
            decoding="async"
            style={{ maxWidth: '100%', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
        )
      ) : mediaType === 'pdf' ? (
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary">
          فتح مرفق PDF عند الطلب
        </a>
      ) : (
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary">
          عرض الملف المرفق
        </a>
      )}
    </div>
  );
};

export default MediaCard;
