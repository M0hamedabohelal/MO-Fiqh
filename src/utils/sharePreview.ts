// أدوات تحديث وسوم المشاركة والبيانات المنظمة في الـ DOM
// مستخلصة من useHashRoute لتسهيل الاختبار والمقروئية

export const PUBLISHER = { "@type": "Organization", name: "يَسِّر", url: "https://fqh.me" };

// تحديث وسوم معاينة المشاركة (WhatsApp / Telegram / Facebook) + وسم الوصف
export function updateSharePreview({ title, description }: { title: string; description: string }): void {
  ["og:title", "twitter:title"].forEach((prop) => {
    document
      .querySelector(`meta[property="${prop}"]`)
      ?.setAttribute("content", title);
  });
  ["og:description", "twitter:description", "description"].forEach((prop) => {
    const el = document.querySelector(
      prop === "description"
        ? 'meta[name="description"]'
        : `meta[property="${prop}"]`,
    );
    el?.setAttribute("content", description);
  });
  // og:url و canonical يشيران للمسار النظيف لا للهاش — نفس URL الصفحة الثابتة،
  // وإلا أعلن التطبيق عنوانين لنفس المحتوى (تكرار) عند كل تنقّل.
  const cleanPath = (window.__currentCleanPath as string | undefined) ?? null;
  const canonicalUrl = cleanPath ? `${window.location.origin}${cleanPath}` : `${window.location.origin}/`;
  const ogUrl = document.querySelector('meta[property="og:url"]');
  ogUrl?.setAttribute("content", canonicalUrl);
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
}

// تحديث بيانات منظمة (JSON-LD) لأجل النتائج الغنية في محركات البحث
export function updateStructuredData(obj: Record<string, unknown>): void {
  let el = document.getElementById("ld-json") as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = "ld-json";
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(obj);
}
