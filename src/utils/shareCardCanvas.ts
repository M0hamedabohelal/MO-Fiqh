// shareCardCanvas.ts — توليد بطاقة المسألة كصورة Canvas 2D عالية الدقة للمشاركة

// دالة لف النص مع دعم RTL
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
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
const drawDivider = (ctx: CanvasRenderingContext2D, y: number, width: number, padding: number): void => {
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
const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
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

export const generateShareCanvas = (title: string, text: string, sheikhComment?: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  const width = 1080;
  const padding = 70;
  const mainFontSize = 26;
  const sheikhFontSize = 24;
  const lineHeight = 44;
  const sheikhLineHeight = 42;
  const maxTextWidth = width - padding * 2;

  // تجهيز النص الرئيسي - كل فقرة على حدة
  const cleanMainText = text.replace(/[﴿﴾]/g, '❝').replace(/[{}]/g, '❝').replace(/[«»]/g, '❝');
  const paragraphs = cleanMainText.split('\n').filter((p) => p.trim());

  // قياس ارتفاع النص الرئيسي
  ctx.font = `${mainFontSize}px 'Amiri', serif`;
  const mainLines: string[] = [];
  paragraphs.forEach((para, idx) => {
    const wrapped = wrapText(ctx, para.trim(), maxTextWidth);
    mainLines.push(...wrapped);
    if (idx < paragraphs.length - 1) mainLines.push(''); // فراغ بين الفقرات
  });

  // تجهيز تعليق الشيخ
  ctx.font = `${sheikhFontSize}px 'Amiri', serif`;
  const sheikhLines: string[] = [];
  if (sheikhComment) {
    const sheikhParagraphs = sheikhComment.split('\n').filter((p) => p.trim());
    sheikhParagraphs.forEach((para, idx) => {
      const wrapped = wrapText(ctx, para.trim(), maxTextWidth - 40);
      sheikhLines.push(...wrapped);
      if (idx < sheikhParagraphs.length - 1) sheikhLines.push('');
    });
  }

  // سقف عدد الأسطر حتى لا تتجاوز الصورة حدود ذاكرة الكانفس
  const MAX_LINES = 180;
  if (mainLines.length > MAX_LINES) {
    mainLines.length = MAX_LINES;
    mainLines.push('…');
  }
  if (sheikhLines.length > MAX_LINES) {
    sheikhLines.length = MAX_LINES;
    sheikhLines.push('…');
  }

  // حساب الارتفاع الكلي
  const titleAreaHeight = 180;
  const mainTextHeight = mainLines.length * lineHeight + 40;
  const dividerHeight = 50;
  const sheikhHeaderHeight = sheikhComment ? 60 : 0;
  const sheikhTextHeight = sheikhComment ? sheikhLines.length * sheikhLineHeight + 40 : 0;
  const footerHeight = 80;

  const height =
    titleAreaHeight + mainTextHeight + dividerHeight + sheikhHeaderHeight + sheikhTextHeight + footerHeight + 40;

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

  // ====== البسملة ======
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c9a84c';
  ctx.font = `bold 32px Amiri Quran, serif`;
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, 70);

  // ====== العنوان ======
  // خلفية العنوان
  ctx.fillStyle = 'rgba(251, 220, 153, 0.12)';
  roundRect(ctx, padding - 10, 100, width - (padding - 10) * 2, 70, 12);
  ctx.fill();

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbdc99';
  ctx.font = `bold 34px 'Amiri', serif`;
  ctx.fillText(title, width / 2, 147);

  // فاصل تحت العنوان
  drawDivider(ctx, titleAreaHeight + 60, width, padding);

  // ====== النص الرئيسي ======
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8e8e8';
  ctx.font = `${mainFontSize}px 'Amiri', serif`;

  let currentY = titleAreaHeight + 105;
  mainLines.forEach((line) => {
    if (line === '') {
      currentY += lineHeight * 0.4;
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
    ctx.font = `bold 26px 'Amiri', serif`;
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
    ctx.font = `${sheikhFontSize}px 'Amiri', serif`;

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

  // خط فوق الفوتر مزخرف
  drawDivider(ctx, footerY - 20, width, padding + 100);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbdc99';
  ctx.font = "bold 22px 'Amiri', serif";
  ctx.fillText('يَسِّر — دراسة وتدبر', width / 2, footerY + 10);

  // نجوم
  ctx.font = '18px Arial';
  ctx.fillText('✦', width / 2 - 180, footerY + 12);
  ctx.fillText('✦', width / 2 + 180, footerY + 12);

  return canvas;
};
