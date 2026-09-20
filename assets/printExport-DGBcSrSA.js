function e({highlights:e,notes:t,lessons:n}){let i=new Date().toLocaleDateString(`ar-EG`,{weekday:`long`,year:`numeric`,month:`long`,day:`numeric`}),a={};(e||[]).forEach(e=>{a[e.lessonId]||(a[e.lessonId]=[]),a[e.lessonId].push(e)});let o=t||{},s={};(n||[]).forEach(e=>{s[e.id]=e});let c=``;Object.entries(a).forEach(([e,t])=>{let n=s[e],r=n?`${n.bookName} — ${n.chapterName} — ${n.title}`:``;c+=`<div class='section-block'><div class='section-source'>${r}</div>${t.map(e=>`<div class='highlight-item'><span class='highlight-color'></span><span class='highlight-text'>${String(e.text).replace(/\n/g,`<br>`)}</span></div>`).join(``)}</div>`});let l=``;Object.entries(o).forEach(([e,t])=>{if(!t||!String(t).trim())return;let n=s[e],r=n?`${n.bookName} — ${n.chapterName} — ${n.title}`:`مسألة غير محددة`;l+=`<div class='section-block'><div class='section-source'>${r}</div><div class='note-item'><div class='note-content'>${String(t).replace(/\n/g,`<br>`)}</div></div></div>`});let u=Object.values(o).filter(e=>e&&String(e).trim()).length;r(`<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><title>فقهي — ملخصاتي</title><link href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' rel='stylesheet'><style>
    @page { margin: 0; size: auto; } /* إخفاء روابط المتصفح العلوية والسفلية */
    body { font-family: 'Amiri', serif; color: #111; line-height: 1.6; font-size: 11.5pt; padding: 1.5cm; margin: 0; }
    .brand-header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 1.5rem; }
    .brand-name { font-size: 24pt; font-weight: bold; color: #c9a54e; border: 2px solid #c9a54e; padding: 0px 20px; border-radius: 10px; display: inline-block; line-height: 1.5; }
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
  </style></head><body>
    <div class='brand-header'>
      <div class='brand-name'>فقهي</div>
      <div class='brand-sub'>تطبيق الباحث الفقهي | ${i}</div>
    </div>
    <div class='report-title'>دفتر الفوائد والملاحظات</div>
    <div class='section-title'>فوائدي المقتبسة (${(e||[]).length})</div>${c||`<div class='empty-msg'>لا توجد فوائد.</div>`}<br>
    <div class='section-title'>ملاحظاتي (${u})</div>${l||`<div class='empty-msg'>لا توجد ملاحظات.</div>`}
  </body></html>`)}function t({chapterName:e,bookName:t,lessons:n}){r(`<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><title>فقهي — ${e}</title><link href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' rel='stylesheet'><style>
    @page { margin: 0; size: auto; } /* إخفاء الروابط العلوية والسفلية */
    body { font-family: 'Amiri', serif; color: #111; line-height: 1.6; font-size: 11.5pt; text-align: justify; padding: 1.5cm; margin: 0; }
    .brand-header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 1.5rem; }
    .brand-name { font-size: 24pt; font-weight: bold; color: #c9a54e; border: 2px solid #c9a54e; padding: 0px 20px; border-radius: 10px; display: inline-block; line-height: 1.5; }
    .brand-sub { display: block; font-size: 11pt; color: #666; margin-top: 8px; }
    .book-title { text-align: center; font-size: 14pt; color: #444; margin-bottom: 0.5rem; font-weight: bold; }
    .chapter-title { text-align: center; font-size: 18pt; color: #c9a54e; margin-bottom: 2rem; }
    .section-block { margin-bottom: 1.5rem; border-bottom: 1px dashed #eee; padding-bottom: 1rem; page-break-inside: avoid; } 
    .section-block:last-child { border-bottom: none; } 
    h3 { color: #c9a54e; margin: 0 0 8px 0; font-size: 14pt; } 
    .lesson-text { margin-bottom: 8px; } 
    .lesson-explanation { margin-top: 6px; padding-top: 6px; border-top: 1px dotted #ccc; color: #444; font-size: 10.5pt; }
  </style></head><body>
    <div class='brand-header'>
      <div class='brand-name'>فقهي</div>
      <div class='brand-sub'>تطبيق الباحث الفقهي | ${new Date().toLocaleDateString(`ar-EG`,{weekday:`long`,year:`numeric`,month:`long`,day:`numeric`})}</div>
    </div>
    <div class='book-title'>${t}</div>
    <div class='chapter-title'>${e}</div>
    ${n.map(e=>`<div class='section-block'><h3>${e.title}</h3><div class='lesson-text'>${e.mainText?String(e.mainText).replace(/\n/g,`<br>`):``}</div>${e.sheikhExplanation?`<div class='lesson-explanation'><strong>الشرح:</strong> ${String(e.sheikhExplanation).replace(/\n/g,`<br>`)}</div>`:``}</div>`).join(``)}
  </body></html>`)}function n(e){let t=new Date().toLocaleDateString(`ar-EG`,{weekday:`long`,year:`numeric`,month:`long`,day:`numeric`});r(`<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><title>فقهي — ${e.title}</title><link href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' rel='stylesheet'><style>
    @page { margin: 0; size: auto; }
    body { font-family: 'Amiri', serif; color: #111; line-height: 1.6; font-size: 11.5pt; text-align: justify; padding: 1.5cm; margin: 0; }
    .brand-header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 1.5rem; }
    .brand-name { font-size: 24pt; font-weight: bold; color: #c9a54e; border: 2px solid #c9a54e; padding: 0px 20px; border-radius: 10px; display: inline-block; line-height: 1.5; }
    .brand-sub { display: block; font-size: 11pt; color: #666; margin-top: 8px; }
    .book-title { text-align: center; font-size: 12pt; color: #666; margin-bottom: 0.5rem; font-weight: bold; }
    .chapter-title { text-align: center; font-size: 14pt; color: #444; margin-bottom: 2rem; }
    .section-block { margin-bottom: 1.5rem; }
    h3 { color: #c9a54e; margin: 0 0 1rem 0; font-size: 16pt; text-align: center; } 
    .lesson-text { margin-bottom: 1rem; font-size: 13pt; line-height: 1.8; } 
    .lesson-explanation { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dotted #ccc; color: #333; font-size: 12pt; line-height: 1.8; }
  </style></head><body>
    <div class='brand-header'>
      <div class='brand-name'>فقهي</div>
      <div class='brand-sub'>تطبيق الباحث الفقهي | ${t}</div>
    </div>
    <div class='book-title'>${e.bookName||``}</div>
    <div class='chapter-title'>${e.chapterName||``}</div>
    <div class='section-block'>
      <h3>${e.title}</h3>
      <div class='lesson-text'>${e.mainText?String(e.mainText).replace(/\n/g,`<br>`):``}</div>
      ${e.sheikhExplanation?`<div class='lesson-explanation'><strong>الشرح:</strong><br><br>${String(e.sheikhExplanation).replace(/\n/g,`<br>`)}</div>`:``}
    </div>
  </body></html>`)}function r(e){let t=document.createElement(`iframe`);t.style.position=`fixed`,t.style.right=`0`,t.style.bottom=`0`,t.style.width=`0`,t.style.height=`0`,t.style.border=`0`,document.body.appendChild(t),t.contentDocument.write(e),t.contentDocument.close(),t.contentWindow.focus(),setTimeout(()=>{t.contentWindow.print(),setTimeout(()=>{document.body.contains(t)&&document.body.removeChild(t)},5e3)},1e3)}export{e as n,n as r,t};