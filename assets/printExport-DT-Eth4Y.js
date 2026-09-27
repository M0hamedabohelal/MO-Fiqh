function e({highlights:e,notes:t,lessons:i}){let a=new Date().toLocaleDateString(`ar-EG`,{weekday:`long`,year:`numeric`,month:`long`,day:`numeric`}),o={};(e||[]).forEach(e=>{o[e.lessonId]||(o[e.lessonId]=[]),o[e.lessonId].push(e)});let s=t||{},c={};(i||[]).forEach(e=>{c[e.id]=e});let l=``;Object.entries(o).forEach(([e,t])=>{let r=c[e],i=r?`${r.bookName} — ${r.chapterName} — ${r.title}`:``;l+=`<div class='section-block'><div class='section-source'>${i}</div>${t.map(e=>`<div class='highlight-item'><span class='highlight-color'></span><span class='highlight-text'>${n(e.text)}</span></div>`).join(``)}</div>`});let u=``;Object.entries(s).forEach(([e,t])=>{if(!t||!String(t).trim())return;let r=c[e],i=r?`${r.bookName} — ${r.chapterName} — ${r.title}`:`مسألة غير محددة`;u+=`<div class='section-block'><div class='section-source'>${i}</div><div class='note-item'><div class='note-content'>${n(t)}</div></div></div>`});let d=Object.values(s).filter(e=>e&&String(e).trim()).length;r(`<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><title>فقهي — ملخصاتي</title><link href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' rel='stylesheet'><style>
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
      <div class='brand-sub'>${a}</div>
    </div>
    <div class='report-title'>دفتر الفوائد والملاحظات</div>
    <div class='section-title'>فوائدي المقتبسة (${(e||[]).length})</div>${l||`<div class='empty-msg'>لا توجد فوائد.</div>`}<br>
    <div class='section-title'>ملاحظاتي (${d})</div>${u||`<div class='empty-msg'>لا توجد ملاحظات.</div>`}
  </body></html>`)}function t({chapterName:e,bookName:t,lessons:i}){r(`<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><title>فقهي — ${e}</title><link href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' rel='stylesheet'><style>
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
      <div class='brand-sub'>${new Date().toLocaleDateString(`ar-EG`,{weekday:`long`,year:`numeric`,month:`long`,day:`numeric`})}</div>
    </div>
    <div class='book-title'>${t}</div>
    <div class='chapter-title'>${e}</div>
    ${i.map(e=>`<div class='section-block'><h3>${e.title}</h3><div class='lesson-text'>${e.mainText?n(e.mainText):``}</div>${e.sheikhExplanation?`<div class='lesson-explanation'><strong>الشرح:</strong> ${n(e.sheikhExplanation)}</div>`:``}</div>`).join(``)}
  </body></html>`)}function n(e){if(!e)return``;let t=String(e).replace(/\n/g,`<br>`);return t=t.replace(/\*\*\*/g,`<div class="islamic-divider-print">۞</div>`),t}function r(e){let t=document.createElement(`iframe`);t.style.position=`fixed`,t.style.right=`0`,t.style.bottom=`0`,t.style.width=`0`,t.style.height=`0`,t.style.border=`0`,document.body.appendChild(t),t.contentDocument.write(e),t.contentDocument.close(),t.contentWindow.focus(),setTimeout(()=>{t.contentWindow.print(),setTimeout(()=>{document.body.contains(t)&&document.body.removeChild(t)},5e3)},1e3)}export{e as n,t};