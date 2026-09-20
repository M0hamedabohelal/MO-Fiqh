function e({highlights:e,notes:t,lessons:n}){let r=new Date().toLocaleDateString(`ar-EG`,{weekday:`long`,year:`numeric`,month:`long`,day:`numeric`}),i={};(e||[]).forEach(e=>{i[e.lessonId]||(i[e.lessonId]=[]),i[e.lessonId].push(e)});let a=t||{},o={};(n||[]).forEach(e=>{o[e.id]=e});let s=``;Object.entries(i).forEach(([e,t])=>{let n=o[e],r=n?`${n.bookName} — ${n.chapterName} — ${n.title}`:``;s+=`<div class="section-block">
      <div class="section-source">${r}</div>
      ${t.map(e=>`<div class="highlight-item">
        <span class="highlight-color"></span>
        <span class="highlight-text">${String(e.text).replace(/\n/g,`<br>`)}</span>
      </div>`).join(``)}
    </div>`});let c=``;Object.entries(a).forEach(([e,t])=>{if(!t||!String(t).trim())return;let n=o[e],r=n?`${n.bookName} — ${n.chapterName} — ${n.title}`:`مسألة غير محددة`;c+=`<div class="section-block">
      <div class="section-source">${r}</div>
      <div class="note-item">
        <div class="note-content">${String(t).replace(/\n/g,`<br>`)}</div>
      </div>
    </div>`});let l=Object.values(a).filter(e=>e&&String(e).trim()).length,u=`<!DOCTYPE html>
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
    <div class="date">${r}</div>
  </div>

  <div class="section">
    <h2>فوائدي المقتبسة (${(e||[]).length})</h2>
    ${s||`<div class="empty-msg">لا توجد فوائد مقتبسة بعد.</div>`}
  </div>

  <div class="section">
    <h2>ملاحظاتي (${l})</h2>
    ${c||`<div class="empty-msg">لا توجد ملاحظات بعد.</div>`}
  </div>

  <div class="footer">تم الإعداد عبر تطبيق الباحث الفقهي — ${r}</div>
</body>
</html>`,d=window.open(``,`_blank`,`width=800,height=600`);if(!d){alert(`برجاء السماح بفتح النوافذ المنبثقة (popup) لتصدير الفوائد.
غيّر إعدادات المتصفح ثم حاول مرة أخرى.`);return}d.document.write(u),d.document.close(),setTimeout(()=>d.print(),500)}function t({chapterName:e,bookName:t,lessons:n}){let r=`<!DOCTYPE html><html lang='ar' dir='rtl'>
  <head>
    <meta charset='utf-8'>
    <title>${e} - طباعة</title>
    <link href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap' rel='stylesheet'>
    <style>
      @page { margin: 2cm; }
      body { font-family: 'Amiri', serif; color: #000; line-height: 2; font-size: 14pt; }
      .header { text-align: center; border-bottom: 2px solid #c9a54e; padding-bottom: 1rem; margin-bottom: 2rem; }
      .header h1 { font-size: 22pt; color: #c9a54e; margin: 0; }
      .header h2 { font-size: 16pt; color: #666; margin: 0 0 10px 0; }
      .section-block { margin-bottom: 2rem; border-bottom: 1px dashed #ccc; padding-bottom: 1rem; page-break-inside: avoid; }
      h3 { color: #c9a54e; margin-bottom: 10px; font-size: 16pt; }
    </style>
  </head>
  <body>
    <div class='header'>
      <h2>${t}</h2>
      <h1>${e}</h1>
      <div class='date'>${new Date().toLocaleDateString(`ar-EG`,{weekday:`long`,year:`numeric`,month:`long`,day:`numeric`})}</div>
    </div>
    ${n.map(e=>`<div class='section-block'><h3>${e.title}</h3><div class='lesson-text'>${e.mainText?String(e.mainText).replace(/\n/g,`<br>`):``}</div><div class='lesson-text' style='margin-top:10px; color:#555;'><strong>شرح الشيخ:</strong><br>${e.sheikhExplanation?String(e.sheikhExplanation).replace(/\n/g,`<br>`):``}</div></div>`).join(``)}
  </body>
  </html>`,i=window.open(``,`_blank`,`width=800,height=600`);i?(i.document.write(r),i.document.close(),setTimeout(()=>i.print(),800)):alert(`برجاء السماح بفتح النوافذ المنبثقة (popup) لتصدير هذا الباب.`)}export{e as n,t};