// HTML parsing utilities — extract structured product data from real HTML.
// Strategy: JSON-LD (Schema.org Product) is the most reliable source, then
// Open Graph / Twitter meta tags, then DOM heuristics. Never invents values.

import type { ScrapedProduct } from "./types";

/** Strip HTML tags to plain text, collapse whitespace. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Decode common HTML entities in attribute values. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/** Extract all <script type="application/ld+json"> blocks as parsed JSON. */
export function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      // malformed JSON-LD — skip
    }
  }
  return out;
}

/** Recursively collect all objects (incl. nested @graph) from JSON-LD. */
export function flattenJsonLd(nodes: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    const obj = n as Record<string, unknown>;
    out.push(obj);
    if (Array.isArray(obj["@graph"])) obj["@graph"].forEach(walk);
    // @type can be array or string; keep node regardless
  };
  nodes.forEach(walk);
  return out;
}

/** Find the first Product-typed object in JSON-LD. */
export function findProductNode(nodes: Record<string, unknown>[]): Record<string, unknown> | null {
  const isProduct = (t: unknown) =>
    (Array.isArray(t) ? t : [t]).some((x) => String(x).toLowerCase() === "product");
  return nodes.find((n) => isProduct(n["@type"])) ?? null;
}

/** Extract a meta tag content by name or property. */
export function getMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*content=["']([^"']*)["']`,
      "i"
    );
    const m = html.match(re);
    if (m && m[1].trim()) return decodeEntities(m[1].trim());
    // reversed order: content before name/property
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
      "i"
    );
    const m2 = html.match(re2);
    if (m2 && m2[1].trim()) return decodeEntities(m2[1].trim());
  }
  return null;
}

/** Extract og:image and all relevant product images. */
export function extractImages(html: string, jsonLdImages: string[] = []): string[] {
  const imgs = new Set<string>(jsonLdImages.filter(Boolean));
  // og:image
  const og = getMeta(html, ["og:image", "og:image:secure_url", "twitter:image"]);
  if (og) imgs.add(og);
  // <img> src attributes (filter tiny icons / sprites)
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = decodeEntities(m[1]);
    if (isProductImage(src)) imgs.add(absoluteUrl(src));
  }
  // data-src lazy-load
  const re2 = /<img[^>]+data-src=["']([^"']+)["']/gi;
  while ((m = re2.exec(html)) !== null) {
    const src = decodeEntities(m[1]);
    if (isProductImage(src)) imgs.add(absoluteUrl(src));
  }
  return Array.from(imgs).slice(0, 8);
}

function isProductImage(src: string): boolean {
  const s = src.toLowerCase();
  if (!s.startsWith("http") && !s.startsWith("//") && !s.startsWith("/")) return false;
  if (s.includes("logo") || s.includes("icon") || s.includes("sprite") || s.includes("avatar")) return false;
  if (s.includes("pixel.") || s.includes("1x1") || s.includes("data:image")) return false;
  return /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(s) || s.includes("images");
}

function absoluteUrl(src: string): string {
  if (src.startsWith("//")) return "https:" + src;
  return src;
}

/** Parse a price string into a number, or null if it can't. */
export function parsePrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && !isNaN(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return null;
  // remove currency symbols, spaces, thousands separators; keep digits, dot, comma
  const cleaned = s
    .replace(/[^\d.,]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "") // drop thousands dot: 1.299 -> 1299
    .replace(/,(?=\d{2}\b)/, "."); // decimal comma: 12,99 -> 12.99
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** Extract a number from a string (review counts, etc). */
export function parseCount(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && !isNaN(raw)) return Math.round(raw);
  const m = String(raw).replace(/[^\d]/g, "");
  if (!m) return null;
  const n = parseInt(m, 10);
  return isNaN(n) ? null : n;
}

/** Parse a rating value (0-5). */
export function parseRating(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && !isNaN(raw)) return Math.min(5, Math.max(0, raw));
  const m = String(raw).match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (isNaN(n)) return null;
  return Math.min(5, Math.max(0, n));
}

/** Map availability strings to our enum. */
export function parseAvailability(raw: unknown): ScrapedProduct["availability"] {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("in stock") || s.includes("instock") || s.includes("disponible")) return "in_stock";
  if (s.includes("out of stock") || s.includes("outofstock") || s.includes("agotado")) return "out_of_stock";
  if (s.includes("low") || s.includes("limited") || s.includes("poco")) return "low_stock";
  return "unknown";
}

/** Build a short feature list from bullet points / description lines. */
export function extractFeatures(html: string, text: string): string[] {
  const feats = new Set<string>();
  // <li> items
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(html)) !== null) {
    const t = htmlToText(m[1]);
    if (t.length >= 8 && t.length <= 140 && !t.includes("{") && looksLikeFeature(t)) {
      feats.add(t);
    }
    if (feats.size >= 8) break;
  }
  return Array.from(feats).slice(0, 6);
}

function looksLikeFeature(t: string): boolean {
  // avoid navigation / legal text
  const lower = t.toLowerCase();
  if (lower.startsWith("cookie") || lower.startsWith("privacidad") || lower.startsWith("iniciar")) return false;
  if (lower.includes("©") || lower.includes("todos los derechos")) return false;
  return true;
}
