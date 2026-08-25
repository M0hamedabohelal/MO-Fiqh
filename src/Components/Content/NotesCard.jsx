import { useState } from 'react';
import { FiEdit3, FiSave, FiDownload } from 'react-icons/fi';
import { motion } from 'framer-motion';

const NotesCard = ({ lessonId, lessonTitle, bookName, chapterName, note, onSave }) => {
  const [text, setText] = useState(note || '');
  const [prevSnapshot, setPrevSnapshot] = useState({ lessonId, note: note || '' });
  const [saved, setSaved] = useState(false);

  // إعادة ضبط النص عند تغيير المسألة أو وصول القيمة المحدثة من السحابة
  if (prevSnapshot.lessonId !== lessonId || prevSnapshot.note !== (note || '')) {
    setPrevSnapshot({ lessonId, note: note || '' });
    setText(note || '');
  }

  const handleSave = () => {
    onSave(lessonId, text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportPDF = () => {
    if (!text.trim()) {
      alert("الملاحظة فارغة! لا يوجد شيء لتصديره.");
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة (Pop-ups) لتحميل الـ PDF.');
      return;
    }
    
    const formattedText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    const html = `
      <html dir="rtl" lang="ar">
        <head>
          <title>ملاحظاتي - ${lessonTitle || 'الفقه'}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              color: #333;
              line-height: 1.8;
              font-size: 18px;
            }
            .header {
              border-bottom: 2px solid #c8a97e;
              padding-bottom: 10px;
              margin-bottom: 20px;
              color: #5c4326;
            }
            .breadcrumb {
              color: #777;
              font-size: 14px;
              margin-bottom: 5px;
            }
            .content {
              white-space: pre-wrap;
              text-align: justify;
            }
            @media print {
              body { padding: 20px; }
              @page { margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>ملاحظاتي وفوائدي الخاصة</h2>
            ${(bookName || chapterName) ? `<div class="breadcrumb">${bookName ? bookName : ''}${bookName && chapterName ? ' / ' : ''}${chapterName ? chapterName : ''}</div>` : ''}
            ${lessonTitle ? `<h4>${lessonTitle}</h4>` : ''}
          </div>
          <div class="content">${formattedText}</div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 300);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="custom-card p-4 p-md-5 mb-4 shadow-sm"
    >
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0 d-flex align-items-center fw-bold" style={{ color: 'var(--primary-color)' }}>
          ملاحظاتي وفوائدي الخاصة <FiEdit3 className="ms-2" />
        </h5>
        <button 
          onClick={handleExportPDF}
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          title="تصدير كـ PDF"
        >
          <FiDownload /> تصدير PDF
        </button>
      </div>
      
      <textarea 
        className="form-control mb-3 p-3" 
        rows="4" 
        placeholder="اكتب فوائدك وملاحظاتك حول هذه المسألة هنا لتحتفظ بها..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ 
          backgroundColor: 'var(--badge-bg)', 
          color: 'var(--text-main)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px',
          resize: 'vertical',
          fontSize: '1.05rem',
          lineHeight: '1.8'
        }}
      ></textarea>
      
      <button 
        onClick={handleSave} 
        className="btn w-100 p-2 shadow-sm d-flex align-items-center justify-content-center" 
        style={{ 
          backgroundColor: saved ? '#27ae60' : 'var(--accent-color)', 
          color: saved ? '#fff' : 'var(--primary-color)', 
          fontWeight: 'bold',
          borderRadius: '10px',
          transition: 'all 0.3s ease'
        }}
      >
        {saved ? 'تم الحفظ بنجاح ✓' : <><FiSave className="ms-2" /> حفظ الملاحظات</>}
      </button>
    </motion.div>
  );
};

export default NotesCard;
