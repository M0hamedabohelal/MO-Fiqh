import{i as e}from"./motion-Bis_Rvlk.js";import{K as t,f as n,s as r,v as i,z as a}from"./react-core-BB82JrRA.js";import{t as o}from"./EmptyState-C9Fj0_qI.js";import{t as s}from"./ShareButton-CqOy9ymt.js";function c({highlights:e,notes:t,lessons:n}){let r=new Date().toLocaleDateString(`ar-EG`,{weekday:`long`,year:`numeric`,month:`long`,day:`numeric`}),i={};(e||[]).forEach(e=>{i[e.lessonId]||(i[e.lessonId]=[]),i[e.lessonId].push(e)});let a=t||{},o={};(n||[]).forEach(e=>{o[e.id]=e});let s=``;Object.entries(i).forEach(([e,t])=>{let n=o[e],r=n?`${n.bookName} — ${n.chapterName} — ${n.title}`:``;s+=`<div class="section-block">
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
غيّر إعدادات المتصفح ثم حاول مرة أخرى.`);return}d.document.write(u),d.document.close(),setTimeout(()=>d.print(),500)}var l=e(),u=({highlights:e,notes:u,lessons:d,onDeleteHighlight:f,onOpenLessonById:p})=>{let m=e.length>0||Object.values(u).some(e=>e&&String(e).trim());return(0,l.jsxs)(`div`,{className:`mt-4 mb-5`,children:[(0,l.jsxs)(`div`,{className:`d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4`,children:[(0,l.jsxs)(`h3`,{className:`mb-0 fw-bold`,style:{color:`var(--primary-color)`},children:[(0,l.jsx)(i,{className:`ms-2`}),` الفوائد المقتبسة`]}),m&&(0,l.jsxs)(`button`,{className:`btn btn-sm d-flex align-items-center shadow-sm`,style:{backgroundColor:`var(--badge-bg)`,border:`1px solid var(--border-color)`,borderRadius:`10px`,fontWeight:`bold`},onClick:()=>c({highlights:e,notes:u,lessons:d}),title:`طباعة أو حفظ PDF`,children:[(0,l.jsx)(a,{className:`ms-2`,size:18}),` تصدير الفوائد والملاحظات`]})]}),e.length===0?(0,l.jsx)(o,{icon:i,message:(0,l.jsxs)(`span`,{children:[`لا توجد فوائد مقتبسة حالياً.`,(0,l.jsx)(`br`,{}),`حدد أي نص في المسائل لحفظه هنا.`]})}):(0,l.jsx)(`div`,{className:`d-flex flex-column gap-3`,children:e.slice().reverse().map(e=>{let i=d.find(t=>t.id===e.lessonId),a=e.bookName||i?.bookName||`كتاب غير محدد`,o=e.chapterName||i?.chapterName||`باب غير محدد`,c=e.title||i?.title||`مسألة غير محددة`;return(0,l.jsxs)(`div`,{className:`custom-card p-3 p-md-4 shadow-sm`,children:[(0,l.jsxs)(`div`,{className:`d-flex align-items-start gap-2 mb-3`,children:[(0,l.jsxs)(`p`,{className:`mb-0 flex-grow-1`,style:{fontSize:`1.1rem`,lineHeight:`1.85`},children:[`"`,e.text,`"`]}),(0,l.jsx)(`button`,{className:`btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`,style:{width:`34px`,height:`34px`,minWidth:`34px`,marginTop:`2px`},onClick:()=>f(e.id),title:`حذف الفائدة`,children:(0,l.jsx)(t,{size:15})})]}),(0,l.jsx)(s,{title:`فائدة مقتبسة`,text:e.text,sheikhComment:``,isSmall:!0}),(0,l.jsx)(`hr`,{style:{opacity:.1}}),(0,l.jsxs)(`div`,{className:`d-flex justify-content-between align-items-center flex-wrap gap-2`,children:[(0,l.jsxs)(`span`,{className:`badge badge-custom text-muted d-flex flex-column align-items-start py-2 px-3`,style:{maxWidth:`65%`},children:[(0,l.jsxs)(`span`,{className:`text-truncate w-100`,children:[(0,l.jsx)(r,{className:`ms-2`}),` `,c]}),(0,l.jsxs)(`small`,{className:`mt-1 text-truncate w-100`,children:[a,` > `,o]})]}),(0,l.jsxs)(`button`,{className:`btn btn-sm btn-light text-primary d-flex align-items-center`,style:{fontWeight:`bold`,flexShrink:0},onClick:()=>p(e.lessonId),children:[`الذهاب للمسألة `,(0,l.jsx)(n,{className:`me-1`})]})]})]},e.id)})})]})};export{u as default};