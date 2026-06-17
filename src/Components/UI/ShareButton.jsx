import React, { useState } from 'react';
import { FiShare2, FiDownload, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';

const ShareButton = ({ title, text, sheikhComment, isSmall }) => {
  const [downloaded, setDownloaded] = useState(false);

  // دالة لف النص مع دعم RTL
  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // رسم خط فاصل مزخرف
  const drawDivider = (ctx, y, width, padding) => {
    const lineY = y;
    const centerX = width / 2;
    
    // الخط الأيمن
    ctx.strokeStyle = 'rgba(251, 220, 153, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX + 20, lineY);
    ctx.lineTo(width - padding, lineY);
    ctx.stroke();
    
    // الخط الأيسر
    ctx.beginPath();
    ctx.moveTo(padding, lineY);
    ctx.lineTo(centerX - 20, lineY);
    ctx.stroke();
    
    // الماسة في المنتصف
    ctx.fillStyle = '#fbdc99';
    ctx.beginPath();
    ctx.moveTo(centerX, lineY - 6);
    ctx.lineTo(centerX + 6, lineY);
    ctx.lineTo(centerX, lineY + 6);
    ctx.lineTo(centerX - 6, lineY);
    ctx.closePath();
    ctx.fill();
  };

  // رسم مستطيل مدور
  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const generateImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const width = 1080;
    const padding = 70;
    const mainFontSize = 26;
    const sheikhFontSize = 24;
    const lineHeight = 44;
    const sheikhLineHeight = 42;
    const maxTextWidth = width - padding * 2;

    // تجهيز النص الرئيسي - كل فقرة على حدة
    const cleanMainText = text.replace(/[﴿﴾]/g, '❝').replace(/[{}]/g, '❝').replace(/[«»]/g, '❝');
    const paragraphs = cleanMainText.split('\n').filter(p => p.trim());
    
    // قياس ارتفاع النص الرئيسي
    ctx.font = `${mainFontSize}px Tajawal, Arial`;
    let mainLines = [];
    paragraphs.forEach((para, idx) => {
      const wrapped = wrapText(ctx, para.trim(), maxTextWidth);
      mainLines.push(...wrapped);
      if (idx < paragraphs.length - 1) mainLines.push(''); // فراغ بين الفقرات
    });

    // تجهيز تعليق الشيخ
    ctx.font = `${sheikhFontSize}px Tajawal, Arial`;
    let sheikhLines = [];
    if (sheikhComment) {
      const sheikhParagraphs = sheikhComment.split('\n').filter(p => p.trim());
      sheikhParagraphs.forEach((para, idx) => {
        const wrapped = wrapText(ctx, para.trim(), maxTextWidth - 40);
        sheikhLines.push(...wrapped);
        if (idx < sheikhParagraphs.length - 1) sheikhLines.push('');
      });
    }

    // حساب الارتفاع الكلي
    const titleAreaHeight = 120;
    const mainTextHeight = mainLines.length * lineHeight + 40;
    const dividerHeight = 50;
    const sheikhHeaderHeight = sheikhComment ? 60 : 0;
    const sheikhTextHeight = sheikhComment ? sheikhLines.length * sheikhLineHeight + 40 : 0;
    const footerHeight = 80;
    
    const height = titleAreaHeight + mainTextHeight + dividerHeight + sheikhHeaderHeight + sheikhTextHeight + footerHeight + 40;
    
    canvas.width = width;
    canvas.height = height;

    // ====== رسم الخلفية ======
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a2e2f');
    gradient.addColorStop(0.5, '#0f3d3e');
    gradient.addColorStop(1, '#0a2e2f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // نقاط زخرفية خفيفة
    ctx.fillStyle = 'rgba(251, 220, 153, 0.04)';
    for (let x = 0; x < width; x += 30) {
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // الإطار الخارجي الذهبي
    ctx.strokeStyle = '#fbdc99';
    ctx.lineWidth = 3;
    roundRect(ctx, 15, 15, width - 30, height - 30, 20);
    ctx.stroke();

    // إطار داخلي خفيف
    ctx.strokeStyle = 'rgba(251, 220, 153, 0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, 25, 25, width - 50, height - 50, 15);
    ctx.stroke();

    // ====== العنوان ======
    // خلفية العنوان
    ctx.fillStyle = 'rgba(251, 220, 153, 0.12)';
    roundRect(ctx, padding - 10, 40, width - (padding - 10) * 2, 70, 12);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbdc99';
    ctx.font = `bold 34px Tajawal, Arial`;
    ctx.fillText(title, width / 2, 87);
    
    // فاصل تحت العنوان
    drawDivider(ctx, titleAreaHeight, width, padding);

    // ====== النص الرئيسي ======
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `${mainFontSize}px Tajawal, Arial`;
    
    let currentY = titleAreaHeight + 45;
    mainLines.forEach((line) => {
      if (line === '') {
        currentY += lineHeight * 0.4; // مسافة أصغر للفقرات الفارغة
      } else {
        ctx.fillText(line, width - padding, currentY);
        currentY += lineHeight;
      }
    });

    // ====== تعليق الشيخ ======
    if (sheikhComment && sheikhLines.length > 0) {
      currentY += 15;
      
      // فاصل قبل تعليق الشيخ
      drawDivider(ctx, currentY, width, padding);
      currentY += 35;

      // خلفية عنوان تعليق الشيخ
      ctx.fillStyle = 'rgba(251, 220, 153, 0.1)';
      roundRect(ctx, padding + 50, currentY - 25, width - (padding + 50) * 2, 40, 8);
      ctx.fill();

      // عنوان تعليق الشيخ
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbdc99';
      ctx.font = `bold 26px Tajawal, Arial`;
      ctx.fillText('📖 تعليق الشيخ', width / 2, currentY + 2);
      currentY += 50;

      // خلفية النص
      const sheikhBoxHeight = sheikhLines.length * sheikhLineHeight + 30;
      ctx.fillStyle = 'rgba(251, 220, 153, 0.06)';
      roundRect(ctx, padding - 5, currentY - 20, width - (padding - 5) * 2, sheikhBoxHeight, 10);
      ctx.fill();
      
      // خط جانبي ذهبي على اليمين
      ctx.fillStyle = 'rgba(251, 220, 153, 0.5)';
      roundRect(ctx, width - padding + 2, currentY - 15, 5, sheikhBoxHeight - 10, 3);
      ctx.fill();

      // نص تعليق الشيخ
      ctx.textAlign = 'right';
      ctx.fillStyle = '#d4c9a8';
      ctx.font = `${sheikhFontSize}px Tajawal, Arial`;

      sheikhLines.forEach((line) => {
        if (line === '') {
          currentY += sheikhLineHeight * 0.4;
        } else {
          ctx.fillText(line, width - padding - 15, currentY);
          currentY += sheikhLineHeight;
        }
      });
    }

    // ====== الفوتر ======
    const footerY = height - 50;
    
    // خط فوق الفوتر
    ctx.strokeStyle = 'rgba(251, 220, 153, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding + 100, footerY - 15);
    ctx.lineTo(width - padding - 100, footerY - 15);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(251, 220, 153, 0.6)';
    ctx.font = '20px Tajawal, Arial';
    ctx.fillText('الباحث الفقهي — دراسة وتدبر', width / 2, footerY + 5);

    // نجوم
    ctx.fillStyle = '#fbdc99';
    ctx.font = '16px Arial';
    ctx.fillText('✦', width / 2 - 180, footerY + 7);
    ctx.fillText('✦', width / 2 + 180, footerY + 7);

    return canvas;
  };

  const handleDownload = () => {
    const canvas = generateImage();
    const link = document.createElement('a');
    link.download = `${title}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  const handleNativeShare = async () => {
    const canvas = generateImage();
    canvas.toBlob(async (blob) => {
      if (navigator.share && blob) {
        try {
          const file = new File([blob], `${title}.png`, { type: 'image/png' });
          await navigator.share({
            title: title,
            text: `📖 ${title}\n\nمن تطبيق الباحث الفقهي`,
            files: [file]
          });
        } catch {
          handleDownload();
        }
      } else {
        handleDownload();
      }
    }, 'image/png');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.3 }}
      className="d-flex gap-2 justify-content-center mb-4"
    >
      <button 
        onClick={handleNativeShare}
        className={`btn d-flex align-items-center gap-2 shadow-sm ${isSmall ? 'btn-sm px-2 py-1' : 'px-3 py-2'}`}
        style={{ 
          backgroundColor: 'var(--primary-color)', 
          color: '#fff', 
          borderRadius: '20px',
          fontSize: isSmall ? '0.8rem' : '0.9rem'
        }}
      >
        <FiShare2 size={isSmall ? 14 : 16} /> {isSmall ? 'مشاركة' : 'مشاركة كصورة'}
      </button>
      
      <button 
        onClick={handleDownload}
        className={`btn d-flex align-items-center gap-2 shadow-sm ${isSmall ? 'btn-sm px-2 py-1' : 'px-3 py-2'}`}
        style={{ 
          backgroundColor: downloaded ? '#27ae60' : 'var(--badge-bg)', 
          color: downloaded ? '#fff' : 'var(--text-main)', 
          borderRadius: '20px',
          border: `1px solid ${downloaded ? '#27ae60' : 'var(--border-color)'}`,
          fontSize: isSmall ? '0.8rem' : '0.9rem',
          transition: 'all 0.3s ease'
        }}
      >
        {downloaded ? <><FiCheck size={isSmall ? 14 : 16} /> {isSmall ? 'تم' : 'تم التحميل'}</> : <><FiDownload size={isSmall ? 14 : 16} /> {isSmall ? 'تنزيل' : 'تحميل كصورة'}</>}
      </button>
    </motion.div>
  );
};

export default ShareButton;
