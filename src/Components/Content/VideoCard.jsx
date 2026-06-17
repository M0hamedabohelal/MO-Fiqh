import React from 'react';
import { motion } from 'framer-motion';

const VideoCard = ({ videoUrl, startTime }) => {
  // Extract the videoId from the YouTube URL
  const extractVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length >= 1) ? match[2] : null;
  };

  // Convert startTime (mm:ss or seconds) to total seconds
  const parseStartTime = (time) => {
    if (!time) return 0;
    const timeStr = time.toString();
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // mm:ss
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // hh:mm:ss
      }
    }
    return parseInt(timeStr, 10) || 0;
  };

  const videoId = extractVideoId(videoUrl);
  const startSeconds = parseStartTime(startTime);

  if (!videoId) return null;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startSeconds}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="custom-card p-3 mb-4 shadow-sm"
      style={{ borderRight: '6px solid var(--primary-color)', borderRadius: '10px' }}
    >
      <div className="d-flex justify-content-between mb-3">
        <small className="fw-bold" style={{ color: 'var(--primary-color)' }}>شاهد شرح المسالة من الشيخ (فيديو)</small>
      </div>
      <div className="ratio ratio-16x9" style={{ borderRadius: '8px', overflow: 'hidden' }}>
        <iframe
          src={embedUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </motion.div>
  );
};

export default VideoCard;
