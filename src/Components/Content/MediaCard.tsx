import { FiImage, FiFileText } from 'react-icons/fi';

interface MediaCardProps {
  mediaUrl?: string;
  mediaType?: string;
}

const MediaCard = ({ mediaUrl, mediaType }: MediaCardProps) => {
  if (!mediaUrl) return null;

  return (
    <div className="custom-card p-4 mt-4 text-center">
      <h5 className="mb-3 fw-bold" style={{ color: 'var(--primary-color)' }}>
        {mediaType === 'pdf' ? (
          <><FiFileText className="ms-2" /> مرفق PDF</>
        ) : (
          <><FiImage className="ms-2" /> صورة مرفقة</>
        )}
      </h5>
      
      {mediaType === 'image' ? (
        <img
          src={mediaUrl}
          alt="مرفق المسألة"
          loading="lazy"
          decoding="async"
          style={{ maxWidth: '100%', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        />
      ) : mediaType === 'pdf' ? (
        <div style={{ height: '70vh', width: '100%', borderRadius: '10px', overflow: 'hidden' }}>
          <iframe 
            src={mediaUrl} 
            loading="lazy"
            width="100%" 
            height="100%" 
            title="مرفق المسألة PDF"
            style={{ border: 'none' }}
          ></iframe>
        </div>
      ) : (
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary">
          عرض الملف المرفق
        </a>
      )}
    </div>
  );
};

export default MediaCard;
