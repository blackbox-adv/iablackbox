// Generic scraper — fallback for any other store. Uses JSON-LD + meta tags.

import type { Scraper, ScrapedProduct } from "./types";
import { fetchPage } from "./web-reader";
import {
  extractJsonLd,
  flattenJsonLd,
  findProductNode,
  getMeta,
  extractImages,
  extractFeatures,
  parsePrice,
  parseCount,
  parseRating,
  parseAvailability,
} from "./html-parser";

export const genericScraper: Scraper = {
  store: "other",
  matches: () => true,
  async scrape(url) {
    const page = await fetchPage(url);
    const html = page.html ?? "";
    const warnings: string[] = [];
    if (!html) warnings.push("No se pudo obtener el HTML de la página");

    const jsonLd = flattenJsonLd(extractJsonLd(html));
    const product = findProductNode(jsonLd);
    if (!product) warnings.push("No se encontró JSON-LD Product — datos limitados");

    const offers = product?.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const firstOffer = Array.isArray(offers) ? offers[0] : offers;

    const name = (product?.name as string) || page.title || getMeta(html, ["og:title", "twitter:title"]);
    const description =
      (product?.description as string) ||
      getMeta(html, ["og:description", "twitter:description", "description"]) ||
      null;

    return {
      sourceUrl: url,
      sourceStore: "other",
      name: clean(name),
      description: clean(description),
      brand: clean(typeof product?.brand === "string" ? product.brand : (product?.brand as Record<string, unknown>)?.name as string),
      category: (product?.category as string) || null,
      images: extractImages(html, normalizeImages(product?.image)),
      features: extractFeatures(html, page.text ?? ""),
      specs: {},
      price: parsePrice(firstOffer?.price) ?? parsePrice(getMeta(html, ["og:price:amount", "product:price:amount"])),
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
    } satisfies ScrapedProduct;
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
