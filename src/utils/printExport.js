export function exportNotesPrint({ highlights, notes, lessons }) {
  const date = new Date().toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const groupedHighlights = {};
  (highlights || []).forEach(h => {
    if (!groupedHighlights[h.lessonId]) groupedHighlights[h.lessonId] = [];
    groupedHighlights[h.lessonId].push(h);
  });

  // notes تأتي كخريطة { [lessonId]: نص الملاحظة }
  const notesMap = notes || {};

  const lessonMap = {};
  (lessons || []).forEach(l => { lessonMap[l.id] = l; });

  let highlightsHtml = '';
  Object.entries(groupedHighlights).forEach(([lessonId, items]) => {
    const lesson = lessonMap[lessonId];
    const source = lesson ? `${lesson.bookName} — ${lesson.chapterName} — ${lesson.title}` : '';
    highlightsHtml += `<div class="section-block">
      <div class="section-source">${source}</div>
      ${items.map(h => `<div class="highlight-item">
        <span class="highlight-color"></span>
        <span class="highlight-text">${String(h.text).replace(/\n/g, '<br>')}</span>
      </div>`).join('')}
    </div>`;
  });

  let notesHtml = '';
  Object.entries(notesMap).forEach(([lessonId, text]) => {
    if (!text || !String(text).trim()) return;
    const lesson = lessonMap[lessonId];
    const source = lesson ? `${lesson.bookName} — ${lesson.chapterName} — ${lesson.title}` : 'مسألة غير محددة';
    notesHtml += `<div class="section-block">
      <div class="section-source">${source}</div>
      <div class="note-item">
        <div class="note-content">${String(text).replace(/\n/g, '<br>')}</div>
      </div>
    </div>`;
  });

  const notesCount = Object.values(notesMap).filter((t) => t && String(t).trim()).length;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>الباحث الفقهي — فوائدي وملاحظاتي</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { margin: 2cm; }
  body { font-family: 'Amiri', serif; color: #1a1a2e; line-height: 2; font-size: 14pt; }
  .header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #c9a54e; padding-bottom: 1.5rem; }
  .header h1 { font-size: 22pt; color: #c9a54e; margin: 0; }
  .header .date { font-size: 11pt; color: #666; margin-top: .5rem; }
  .section { margin-bottom: 2rem; }
  .section h2 { font-size: 16pt; color: #c9a54e; border-bottom: 1px solid #e0d5b0; padding-bottom: .5rem; }
  .section-block { margin-bottom: 1.2rem; }
  .section-source { font-size: 10pt; color: #888; margin-bottom: .3rem; }
  .highlight-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; padding: 6px 8px; background: #faf6e8; border-radius: 4px; }
  .highlight-color { width: 4px; min-height: 18px; border-radius: 2px; flex-shrink: 0; background: #c9a54e; }
  .highlight-text { flex: 1; }
  .note-item { margin-bottom: 10px; padding: 8px; border-right: 3px solid #c9a54e; background: #faf6e8; border-radius: 4px; }
  .note-quote { font-style: italic; color: #555; margin-bottom: 4px; }
  .note-content { font-weight: bold; }
  .empty-msg { color: #aaa; font-style: italic; text-align: center; padding: 1.5rem; }
  .footer { text-align: center; margin-top: 3rem; font-size: 9pt; color: #aaa; border-top: 1px solid #eee; padding-top: 1rem; }
  @media print { body { font-size: 12pt; } }
</style>
</head>
<body>
  <div class="header">
    <h1>الباحث الفقهي</h1>
    <div class="date">${date}</div>
  </div>

  <div class="section">
    <h2>فوائدي المقتبسة (${(highlights || []).length})</h2>
    ${highlightsHtml || '<div class="empty-msg">لا توجد فوائد مقتبسة بعد.</div>'}
  </div>

  <div class="section">
    <h2>ملاحظاتي (${notesCount})</h2>
    ${notesHtml || '<div class="empty-msg">لا توجد ملاحظات بعد.</div>'}
  </div>

  <div class="footer">تم الإعداد عبر تطبيق الباحث الفقهي — ${date}</div>
</body>
</html>`;

  const popup = window.open('', '_blank', 'width=800,height=600');
  if (!popup) {
    alert('برجاء السماح بفتح النوافذ المنبثقة (popup) لتصدير الفوائد.\nغيّر إعدادات المتصفح ثم حاول مرة أخرى.');
    return;
  }
  popup.document.write(html);
  popup.document.close();
  setTimeout(() => popup.print(), 500);
}
