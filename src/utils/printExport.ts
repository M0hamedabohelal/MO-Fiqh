import type { Lesson, HighlightItem } from '../types';

interface NotesPrintInput {
  highlights?: HighlightItem[];
  notes?: Record<string, string>;
  lessons?: Lesson[];
}

export function exportNotesPrint({ highlights, notes, lessons }: NotesPrintInput): void {
  const date = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const groupedHighlights: Record<string, HighlightItem[]> = {};
  (highlights || []).forEach((h) => {
    const key = String(h.lessonId);
    if (!groupedHighlights[key]) groupedHighlights[key] = [];
    groupedHighlights[key].push(h);
  });
  const notesMap = notes || {};
  const lessonMap: Record<string, Lesson> = {};
  (lessons || []).forEach((l) => { lessonMap[String(l.id)] = l; });

  let highlightsHtml = '';
  Object.entries(groupedHighlights).forEach(([lessonId, items]) => {
    const lesson = lessonMap[lessonId];
    const source = lesson ? `${lesson.bookName} — ${lesson.chapterName} — ${lesson.title}` : '';
    highlightsHtml += `<div class='section-block'><div class='section-source'>${source}</div>${items.map(h => `<div class='highlight-item'><span class='highlight-color'></span><span class='highlight-text'>${formatPrintText(h.text)}</span></div>`).join('')}</div>`;
  });

  let notesHtml = '';
  Object.entries(notesMap).forEach(([lessonId, text]) => {
    if (!text || !String(text).trim()) return;
    const lesson = lessonMap[lessonId];
    const source = lesson ? `${lesson.bookName} — ${lesson.chapterName} — ${lesson.title}` : 'مسألة غير محددة';
    notesHtml += `<div class='section-block'><div class='section-source'>${source}</div><div class='note-item'><div class='note-content'>${formatPrintText(text)}</div></div></div>`;
  });

  const notesCount = Object.values(notesMap).filter(t => t && String(t).trim()).length;

  const html = `<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><title>فقهي — ملخصاتي</title><link href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' rel='stylesheet'><style>
    @page { margin: 0; size: auto; } /* إخفاء روابط المتصفح العلوية والسفلية */
    body { font-family: 'Amiri', serif; color: #111; line-height: 1.6; font-size: 11.5pt; padding: 1.5cm; margin: 0; }
    .brand-header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 1.5rem; }
    .brand-name { font-size: 20pt; font-weight: bold; color: #c9a54e; border: 2px solid #c9a54e; padding: 4px 20px; border-radius: 10px; display: inline-block; line-height: 1.5; }
    .brand-sub { display: block; font-size: 11pt; color: #666; margin-top: 8px; }
    .report-title { text-align: center; font-size: 14pt; color: #444; margin-bottom: 1.5rem; }
    .header .date { font-size: 9pt; color: #666; } 
    .section-title { font-size: 14pt; color: #c9a54e; border-bottom: 1px solid #eee; margin-bottom: 10px; padding-bottom: 4px; } 
    .section-block { margin-bottom: 1rem; page-break-inside: avoid; } 
    .section-source { font-size: 9pt; color: #888; margin-bottom: 4px; font-weight: bold; } 
    .highlight-item { display: flex; gap: 8px; margin-bottom: 6px; padding: 6px; background: #faf6e8; border-radius: 4px; } 
    .highlight-color { width: 3px; background: #c9a54e; border-radius: 2px; flex-shrink: 0; } 
    .highlight-text { flex: 1; } 
    .note-item { margin-bottom: 6px; padding: 6px 8px; border-right: 3px solid #c9a54e; background: #faf6e8; } 
    .empty-msg { color: #aaa; text-align: center; font-size: 10pt; }
    .islamic-divider-print { text-align: center; color: #c9a54e; font-size: 16pt; margin: 15px 0; line-height: 1; display: block; }
  </style></head><body>
    <div class='brand-header'>
      <div class='brand-name'>تطبيق الباحث الفقهي</div>
      <div class='brand-sub'>${date}</div>
    </div>
    <div class='report-title'>دفتر الفوائد والملاحظات</div>
    <div class='section-title'>فوائدي المقتبسة (${(highlights || []).length})</div>${highlightsHtml || `<div class='empty-msg'>لا توجد فوائد.</div>`}<br>
    <div class='section-title'>ملاحظاتي (${notesCount})</div>${notesHtml || `<div class='empty-msg'>لا توجد ملاحظات.</div>`}
  </body></html>`;
  
  printViaIframe(html);
}

export function exportChapterPrint({ chapterName, bookName, lessons }: { chapterName: string; bookName: string; lessons: Lesson[] }): void {
  const date = new Date().toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const lessonsHtml = lessons.map(l => `<div class='section-block'><h3>${l.title}</h3><div class='lesson-text'>${l.mainText ? formatPrintText(l.mainText) : ''}</div>${l.sheikhExplanation ? `<div class='lesson-explanation'><strong>الشرح:</strong> ${formatPrintText(l.sheikhExplanation)}</div>` : ''}</div>`).join('');
  
  const html = `<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><title>فقهي — ${chapterName}</title><link href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' rel='stylesheet'><style>
    @page { margin: 0; size: auto; } /* إخفاء الروابط العلوية والسفلية */
    body { font-family: 'Amiri', serif; color: #111; line-height: 1.6; font-size: 11.5pt; text-align: justify; padding: 1.5cm; margin: 0; }
    .brand-header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 1.5rem; }
    .brand-name { font-size: 20pt; font-weight: bold; color: #c9a54e; border: 2px solid #c9a54e; padding: 4px 20px; border-radius: 10px; display: inline-block; line-height: 1.5; }
    .brand-sub { display: block; font-size: 11pt; color: #666; margin-top: 8px; }
    .book-title { text-align: center; font-size: 14pt; color: #444; margin-bottom: 0.5rem; font-weight: bold; }
    .chapter-title { text-align: center; font-size: 18pt; color: #c9a54e; margin-bottom: 2rem; }
    .section-block { margin-bottom: 1.5rem; border-bottom: 1px dashed #eee; padding-bottom: 1rem; page-break-inside: avoid; } 
    .section-block:last-child { border-bottom: none; } 
    h3 { color: #c9a54e; margin: 0 0 8px 0; font-size: 14pt; } 
    .lesson-text { margin-bottom: 8px; } 
    .lesson-explanation { margin-top: 6px; padding-top: 6px; border-top: 1px dotted #ccc; color: #444; font-size: 10.5pt; }
    .islamic-divider-print { text-align: center; color: #c9a54e; font-size: 16pt; margin: 15px 0; line-height: 1; display: block; }
  </style></head><body>
    <div class='brand-header'>
      <div class='brand-name'>تطبيق الباحث الفقهي</div>
      <div class='brand-sub'>${date}</div>
    </div>
    <div class='book-title'>${bookName}</div>
    <div class='chapter-title'>${chapterName}</div>
    ${lessonsHtml}
  </body></html>`;
  
  printViaIframe(html);
}

// دالة مساعدة لتنسيق النص للطباعة واستبدال النجوم بفاصل إسلامي جميل
function formatPrintText(text: string): string {
  if (!text) return '';
  let formatted = String(text).replace(/\n/g, '<br>');
  // استبدال النجوم (العادية أو العربية) بفاصل مزخرف يتوسط الصفحة
  formatted = formatted.replace(/[*٭]{3,}/g, '<div class="islamic-divider-print">۞</div>');
  return formatted;
}

function printViaIframe(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.write(html);
  doc.close();
  win.focus();

  setTimeout(() => {
    win.print();
    // Some browsers block UI if we remove it too quickly
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 5000);
  }, 1000);
}
