import{i as e}from"./motion-Bis_Rvlk.js";import{B as t,f as n,h as r,q as i,s as a,y as o}from"./react-core-C389IDOr.js";import{n as s}from"./index-CwDol27L.js";import{t as c}from"./EmptyState-B7clODOR.js";import{t as l}from"./ShareButton-BKBBMSqA.js";function u({highlights:e,notes:t,lessons:n}){let r=new Date().toLocaleDateString(`ar-EG`,{weekday:`long`,year:`numeric`,month:`long`,day:`numeric`}),i={};(e||[]).forEach(e=>{i[e.lessonId]||(i[e.lessonId]=[]),i[e.lessonId].push(e)});let a=t||{},o={};(n||[]).forEach(e=>{o[e.id]=e});let s=``;Object.entries(i).forEach(([e,t])=>{let n=o[e],r=n?`${n.bookName} — ${n.chapterName} — ${n.title}`:``;s+=`<div class="section-block">
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
غيّر إعدادات المتصفح ثم حاول مرة أخرى.`);return}d.document.write(u),d.document.close(),setTimeout(()=>d.print(),500)}var d=e(),f=({highlights:e,notes:f,lessons:p,onDeleteHighlight:m,onOpenLessonById:h,onOpenLogin:g})=>{let{user:_}=s(),v=e.length>0||Object.values(f).some(e=>e&&String(e).trim());return(0,d.jsxs)(`div`,{className:`mt-4 mb-5`,children:[(0,d.jsxs)(`div`,{className:`d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4`,children:[(0,d.jsxs)(`h3`,{className:`mb-0 fw-bold`,style:{color:`var(--primary-color)`},children:[(0,d.jsx)(o,{className:`ms-2`}),` الفوائد المقتبسة`]}),(0,d.jsxs)(`div`,{className:`d-flex gap-2`,children:[!_&&(0,d.jsxs)(`button`,{onClick:g,className:`btn btn-outline-primary btn-sm d-flex align-items-center gap-1`,children:[(0,d.jsx)(r,{}),` حفظ سحابي`]}),v&&(0,d.jsxs)(`button`,{className:`btn btn-sm d-flex align-items-center shadow-sm`,style:{backgroundColor:`var(--badge-bg)`,border:`1px solid var(--border-color)`,borderRadius:`10px`,fontWeight:`bold`},onClick:()=>u({highlights:e,notes:f,lessons:p}),title:`طباعة أو حفظ PDF`,children:[(0,d.jsx)(t,{className:`ms-2`,size:18}),` تصدير الفوائد والملاحظات`]})]})]}),!_&&v&&(0,d.jsxs)(`div`,{className:`alert alert-warning py-2 small d-flex align-items-center gap-2`,role:`alert`,children:[(0,d.jsx)(r,{size:18}),(0,d.jsxs)(`span`,{children:[`أنت تتصفح كضيف. `,(0,d.jsx)(`a`,{href:`#`,onClick:e=>{e.preventDefault(),g()},className:`alert-link`,children:`سجّل الدخول`}),` لحفظ فوائدك سحابياً.`]})]}),e.length===0?(0,d.jsx)(c,{icon:o,message:(0,d.jsxs)(`span`,{children:[`لا توجد فوائد مقتبسة حالياً.`,(0,d.jsx)(`br`,{}),`حدد أي نص في المسائل لحفظه هنا.`]})}):(0,d.jsx)(`div`,{className:`d-flex flex-column gap-3`,children:e.slice().reverse().map(e=>{let t=p.find(t=>t.id===e.lessonId),r=e.bookName||t?.bookName||`كتاب غير محدد`,o=e.chapterName||t?.chapterName||`باب غير محدد`,s=e.title||t?.title||`مسألة غير محددة`;return(0,d.jsxs)(`div`,{className:`custom-card p-3 p-md-4 shadow-sm`,children:[(0,d.jsxs)(`div`,{className:`d-flex align-items-start gap-2 mb-3`,children:[(0,d.jsxs)(`p`,{className:`mb-0 flex-grow-1`,style:{fontSize:`1.1rem`,lineHeight:`1.85`},children:[`"`,e.text,`"`]}),(0,d.jsx)(`button`,{className:`btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`,style:{width:`34px`,height:`34px`,minWidth:`34px`,marginTop:`2px`},onClick:()=>m(e.id),title:`حذف الفائدة`,children:(0,d.jsx)(i,{size:15})})]}),(0,d.jsx)(l,{title:`فائدة مقتبسة`,text:e.text,sheikhComment:``,isSmall:!0}),(0,d.jsx)(`hr`,{style:{opacity:.1}}),(0,d.jsxs)(`div`,{className:`d-flex justify-content-between align-items-center flex-wrap gap-2`,children:[(0,d.jsxs)(`span`,{className:`badge badge-custom text-muted d-flex flex-column align-items-start py-2 px-3`,style:{maxWidth:`65%`},children:[(0,d.jsxs)(`span`,{className:`text-truncate w-100`,children:[(0,d.jsx)(a,{className:`ms-2`}),` `,s]}),(0,d.jsxs)(`small`,{className:`mt-1 text-truncate w-100`,children:[r,` > `,o]})]}),(0,d.jsxs)(`button`,{className:`btn btn-sm btn-light text-primary d-flex align-items-center`,style:{fontWeight:`bold`,flexShrink:0},onClick:()=>h(e.lessonId),children:[`الذهاب للمسألة `,(0,d.jsx)(n,{className:`me-1`})]})]})]},e.id)})})]})};export{f as default};