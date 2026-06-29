// Temu scraper — Temu is heavily JS-driven, so JSON-LD/meta are the main path.
// Real data only; null when not found. Many fields may be null for Temu.

import type { Scraper, ScrapedProduct } from "./types";
import { fetchPage } from "./web-reader";
import {
  extractJsonLd,
  flattenJsonLd,
  findProductNode,
  getMeta,
  extractImages,
  parsePrice,
  parseCount,
  parseRating,
  parseAvailability,
} from "./html-parser";

export const temuScraper: Scraper = {
  store: "temu",
  matches: (url) => /temu\.com/i.test(url),
  async scrape(url) {
    const page = await fetchPage(url);
    const html = page.html ?? "";
    const warnings: string[] = [];
    if (!html) {
      warnings.push("No se pudo obtener el HTML de la página (Temu puede requerir JS)");
    } else if (html.length < 2000) {
      warnings.push("HTML muy corto — Temu puede estar bloqueando el reader o requiriendo JS");
    }

    const jsonLd = flattenJsonLd(extractJsonLd(html));
    const product = findProductNode(jsonLd);
    if (!product) warnings.push("No se encontró JSON-LD Product");

    const offers = product?.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const firstOffer = Array.isArray(offers) ? offers[0] : offers;

    const name = (product?.name as string) || page.title || getMeta(html, ["og:title", "twitter:title"]);
    const description =
      (product?.description as string) ||
      getMeta(html, ["og:description", "twitter:description", "description"]) ||
      null;

    // Temu embeds price in meta tags / inline scripts when JSON-LD is absent
    const metaPrice = parsePrice(
      getMeta(html, ["og:price:amount", "product:price:amount", "og:price"])
    );

    const result: ScrapedProduct = {
      sourceUrl: url,
      sourceStore: "temu",
      name: clean(name),
      description: clean(description),
      brand: clean(typeof product?.brand === "string" ? product.brand : (product?.brand as Record<string, unknown>)?.name as string),
      category: (product?.category as string) || null,
      images: extractImages(html, normalizeImages(product?.image)),
      features: [],
      specs: {},
      price: parsePrice(firstOffer?.price) ?? metaPrice,
      originalPrice: null,
      currency: (firstOffer?.priceCurrency as string) || getMeta(html, ["og:price:currency", "product:price:currency"]) || null,
      availability: parseAvailability(firstOffer?.availability ?? getMeta(html, ["product:availability"])),
      rating: parseRating(product?.aggregateRating ? (product.aggregateRating as Record<string, unknown>).ratingValue : null),
      reviewCount: parseCount(product?.aggregateRating ? (product.aggregateRating as Record<string, unknown>).reviewCount : null),
      shippingTime: null,
      shippingCost: null,
      metaDescription: getMeta(html, ["og:description", "description"]),
      fetchedAt: new Date().toISOString(),
      warnings,
    };

    // Temu often shows "sold X" / discount inline
    if (result.price != null) {
      const discMatch = html.match(/(\d{1,2})%\s*off/i);
      if (discMatch) {
        const pct = parseInt(discMatch[1], 10) / 100;
        if (pct > 0 && pct < 0.95) result.originalPrice = Math.round((result.price / (1 - pct)) * 100) / 100;
      }
    }

    return result;
  },
};

function normalizeImages(img: unknown): string[] {
  if (!img) return [];
  if (Array.isArray(img)) return img.map(String).filter(Boolean);
  if (typeof img === "string") return [img];
  return [];
}

function clean(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > 0 ? t.slice(0, 2000) : null;
}
