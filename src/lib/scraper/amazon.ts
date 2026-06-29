// Amazon scraper — relies on Schema.org JSON-LD Product + meta tags.
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
  htmlToText,
} from "./html-parser";

export const amazonScraper: Scraper = {
  store: "amazon",
  matches: (url) => /amazon\.|amzn\./i.test(url),
  async scrape(url) {
    const page = await fetchPage(url);
    const html = page.html ?? "";
    const warnings: string[] = [];
    if (!html) warnings.push("No se pudo obtener el HTML de la página");

    const jsonLd = flattenJsonLd(extractJsonLd(html));
    const product = findProductNode(jsonLd);
    if (!product) warnings.push("No se encontró JSON-LD Product");

    const offers = (product?.offers as Record<string, unknown> | Record<string, unknown>[] | undefined);
    const firstOffer = Array.isArray(offers) ? offers[0] : offers;

    const name = (product?.name as string) || page.title || getMeta(html, ["og:title", "twitter:title"]);
    const description =
      (product?.description as string) ||
      getMeta(html, ["og:description", "twitter:description", "description"]) ||
      null;
    const brandNode = product?.brand as Record<string, unknown> | undefined;
    const brand = (brandNode?.name as string) || (typeof product?.brand === "string" ? product.brand : null);
    const category = (product?.category as string) || null;

    const images = extractImages(html, normalizeImages(product?.image));
    const price = parsePrice(firstOffer?.price ?? firstOffer?.priceSpecification);
    const originalPrice = parsePrice(firstOffer?.price) && parsePrice(firstOffer?.["priceValidUntil"]) ? null : null;

    const result: ScrapedProduct = {
      sourceUrl: url,
      sourceStore: "amazon",
      name: clean(name),
      description: clean(description),
      brand: clean(brand),
      category,
      images,
      features: [],
      specs: {},
      price,
      originalPrice: null,
      currency: (firstOffer?.priceCurrency as string) || null,
      availability: parseAvailability(firstOffer?.availability),
      rating: parseRating(product?.aggregateRating ? (product.aggregateRating as Record<string, unknown>).ratingValue : null),
      reviewCount: parseCount(product?.aggregateRating ? (product.aggregateRating as Record<string, unknown>).reviewCount : null),
      shippingTime: null,
      shippingCost: null,
      metaDescription: getMeta(html, ["og:description", "description"]),
      fetchedAt: new Date().toISOString(),
      warnings,
    };

    // Try to find original/list price from DOM (Amazon shows it as "Precio sugerido")
    if (price != null) {
      const listMatch = html.match(/(?:Precio\s+sugerido|List\s+Price|M.R.P)[^0-9]*([\d.,]+)/i);
      const listPrice = parsePrice(listMatch?.[1]);
      if (listPrice != null && listPrice > price) result.originalPrice = listPrice;
    }

    return result;
  },
};

function normalizeImages(img: unknown): string[] {
  if (!img) return [];
  if (Array.isArray(img)) return img.map(String).filter(Boolean);
  if (typeof img === "string") return [img];
  if (typeof img === "object" && img !== null) {
    const o = img as Record<string, unknown>;
    if (typeof o.url === "string") return [o.url];
  }
  return [];
}

function clean(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = htmlToText(s);
  return t.length > 0 ? t.slice(0, 2000) : null;
}

// silence unused import in some bundlers
void htmlToText;
