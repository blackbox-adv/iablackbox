// Falabella scraper — uses JSON-LD Product + meta tags.
// Real data only; null when not found.

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
  extractFeatures,
} from "./html-parser";

export const falabellaScraper: Scraper = {
  store: "falabella",
  matches: (url) => /falabella\.com/i.test(url),
  async scrape(url) {
    const page = await fetchPage(url);
    const html = page.html ?? "";
    const warnings: string[] = [];
    if (!html) warnings.push("No se pudo obtener el HTML de la página");

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
    const brandNode = product?.brand as Record<string, unknown> | undefined;
    const brand = (brandNode?.name as string) || (typeof product?.brand === "string" ? product.brand : null);

    const price = parsePrice(firstOffer?.price);
    const images = extractImages(html, normalizeImages(product?.image));

    const result: ScrapedProduct = {
      sourceUrl: url,
      sourceStore: "falabella",
      name: clean(name),
      description: clean(description),
      brand: clean(brand),
      category: (product?.category as string) || null,
      images,
      features: extractFeatures(html, page.text ?? ""),
      specs: {},
      price,
      originalPrice: price != null ? findOriginalPrice(html, price) : null,
      currency: (firstOffer?.priceCurrency as string) || "CLP",
      availability: parseAvailability(firstOffer?.availability),
      rating: parseRating(product?.aggregateRating ? (product.aggregateRating as Record<string, unknown>).ratingValue : null),
      reviewCount: parseCount(product?.aggregateRating ? (product.aggregateRating as Record<string, unknown>).reviewCount : null),
      shippingTime: null,
      shippingCost: null,
      metaDescription: getMeta(html, ["og:description", "description"]),
      fetchedAt: new Date().toISOString(),
      warnings,
    };
    return result;
  },
};

function findOriginalPrice(html: string, currentPrice: number): number | null {
  // Falabella often shows "Antes: $X" or tachado pricing
  const re = /(?:Antes|Normal|Original)[^0-9]*([\d.,]+)/i;
  const m = html.match(re);
  const p = m ? parseFloat(m[1].replace(/[^\d.,]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".")) : null;
  if (p != null && p > currentPrice) return p;
  return null;
}

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
