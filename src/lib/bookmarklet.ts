// BLACKBOX bookmarklet generator.
//
// The bookmarklet runs in the admin's REAL browser on a store product page
// (Temu, Amazon, Falabella, etc.). Because it's the user's actual browser:
//   - the page is fully JS-rendered (no empty shell like our scraper gets)
//   - the user is logged in / not blocked by anti-bot
//   - the DOM has all the real product data
//
// The bookmarklet extracts the data and opens BLACKBOX with it pre-filled,
// so the admin just reviews and saves. This bypasses all anti-bot protections
// because there IS no bot — it's the user's browser.

/**
 * The extractor script that runs on the product page. Returns a JSON object
 * with whatever real data it can find. Kept as a string so it can be
 * bookmarklet-encoded.
 */
export const EXTRACTOR_SCRIPT = `(() => {
  const clean = s => (s || '').replace(/\\u200b/g, '').trim();
  const txt = el => el ? clean(el.innerText || el.textContent || '') : '';
  const attr = (el, name) => el ? clean(el.getAttribute(name) || '') : '';

  // --- name ---
  let name = '';
  const h1 = document.querySelector('h1');
  if (h1) name = txt(h1);
  if (!name) {
    const og = document.querySelector('meta[property="og:title"]');
    if (og) name = attr(og, 'content');
  }
  if (!name || name.length < 5) name = clean(document.title);

  // --- price ---
  let price = null, originalPrice = null, currency = null;
  // try JSON-LD first
  const ld = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of ld) {
    try {
      const p = JSON.parse(s.textContent);
      const arr = Array.isArray(p) ? p : [p];
      for (const o of arr) {
        if (o['@type'] === 'Product' || (Array.isArray(o['@type']) && o['@type'].includes('Product'))) {
          if (!name && o.name) name = clean(o.name);
          const off = Array.isArray(o.offers) ? o.offers[0] : o.offers;
          if (off && off.price && !price) {
            price = parseFloat(String(off.price).replace(/[^\\d.,]/g, '').replace(',', '.'));
            currency = off.priceCurrency || null;
          }
          if (o.brand) name = name; // keep
        }
      }
    } catch(e) {}
  }
  // try price elements
  if (!price) {
    const pe = document.querySelectorAll('[class*="price" i], [data-price], [itemprop="price"]');
    for (const el of pe) {
      const t = txt(el);
      const m = t.match(/S\\/\\s*[\\d.,]+|\\$\\s*[\\d.,]+|USD\\s*[\\d.,]+|PEN\\s*[\\d.,]+|[\\d.,]+/);
      if (m) {
        const n = parseFloat(String(m[0]).replace(/[^\\d.,]/g, '').replace(',', '.'));
        if (n > 0 && !price) { price = n; break; }
      }
    }
  }

  // --- description ---
  let desc = '';
  const ogd = document.querySelector('meta[property="og:description"]');
  if (ogd) desc = attr(ogd, 'content');
  if (!desc) { const md = document.querySelector('meta[name="description"]'); if (md) desc = attr(md, 'content'); }

  // --- brand ---
  let brand = '';
  const bEl = document.querySelector('[itemprop="brand"], [class*="brand" i]');
  if (bEl) brand = txt(bEl);

  // --- images ---
  const imgs = [];
  const ogi = document.querySelector('meta[property="og:image"]');
  if (ogi) imgs.push(attr(ogi, 'content'));
  document.querySelectorAll('img').forEach(img => {
    const src = img.src || img.getAttribute('data-src');
    if (src && /\\.(jpg|jpeg|png|webp|avif)/i.test(src) && !src.includes('icon') && !src.includes('logo')) {
      if (imgs.indexOf(src) < 0) imgs.push(src);
    }
  });

  // --- category guess ---
  const bodyTxt = clean(document.body.innerText).toLowerCase();
  let category = 'Tecnologia';
  if (/audifo|bluetooth|earbud|speaker|soundbar/.test(bodyTxt)) category = 'Audio';
  else if (/teclado|mouse|gamer|gaming|joystick/.test(bodyTxt)) category = 'Gaming';
  else if (/cargador|usb|power ?bank|bateria|cable/.test(bodyTxt)) category = 'Accesorios moviles';
  else if (/ventilador|gadget|viral/.test(bodyTxt)) category = 'Gadgets virales';

  return {
    name: name.slice(0, 300),
    price: price,
    currency: currency,
    originalPrice: originalPrice,
    description: desc.slice(0, 1000),
    brand: brand.slice(0, 100),
    images: imgs.slice(0, 6),
    category: category,
    sourceUrl: location.href,
    sourceDomain: location.hostname
  };
})()`;

/**
 * Build the full bookmarklet: extract data, encode it, open BLACKBOX.
 */
export function buildBookmarklet(blackboxUrl: string): string {
  // The bookmarklet: extract → encode → open BLACKBOX with hash
  const openScript = `(() => {
    const data = ${EXTRACTOR_SCRIPT};
    const json = JSON.stringify(data);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    const u = ${JSON.stringify(blackboxUrl)} + '#import=' + b64;
    window.open(u, '_blank');
  })();`;
  // Minify-ish + encode for href
  return "javascript:" + encodeURIComponent(openScript.replace(/\n\s*/g, " "));
}

/**
 * Decode an import payload from a URL hash (#import=base64...).
 * Returns null if invalid.
 */
export function decodeImportPayload(hash: string): {
  name: string;
  price: number | null;
  currency: string | null;
  originalPrice: number | null;
  description: string;
  brand: string;
  images: string[];
  category: string;
  sourceUrl: string;
  sourceDomain: string;
} | null {
  const m = hash.match(/#import=([A-Za-z0-9+/=]+)/);
  if (!m) return null;
  try {
    const json = decodeURIComponent(escape(atob(m[1])));
    const data = JSON.parse(json);
    return {
      name: String(data.name || ""),
      price: typeof data.price === "number" ? data.price : null,
      currency: data.currency || null,
      originalPrice: typeof data.originalPrice === "number" ? data.originalPrice : null,
      description: String(data.description || ""),
      brand: String(data.brand || ""),
      images: Array.isArray(data.images) ? data.images.map(String).slice(0, 6) : [],
      category: String(data.category || "Tecnología"),
      sourceUrl: String(data.sourceUrl || ""),
      sourceDomain: String(data.sourceDomain || ""),
    };
  } catch {
    return null;
  }
}
