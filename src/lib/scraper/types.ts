// BLACKBOX scraper module — shared types & contracts.
// Real-data-only: every field is nullable. "No disponible" is the UI's job;
// the scraper never invents values.

export type StoreId = "amazon" | "temu" | "falabella" | "other";

/**
 * The raw product data extracted from a real store page.
 * Every field is optional — if the scraper can't find it, it's `null`.
 * The AI and UI MUST treat `null` as "No disponible", never invent a value.
 */
export interface ScrapedProduct {
  sourceUrl: string;
  sourceStore: StoreId;
  name: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  images: string[];
  features: string[];
  specs: Record<string, string>;
  // pricing (the single offer scraped from the source page)
  price: number | null;
  originalPrice: number | null;
  currency: string | null;
  availability: "in_stock" | "low_stock" | "out_of_stock" | "unknown";
  rating: number | null;
  reviewCount: number | null;
  shippingTime: string | null;
  shippingCost: number | null;
  // raw metadata for debugging / AI context
  metaDescription: string | null;
  fetchedAt: string; // ISO
  warnings: string[]; // non-fatal issues (e.g. "JSON-LD not found")
}

/**
 * A store-specific scraper. Implement one per store; the registry picks the
 * right one based on the URL. Future official-API adapters implement this
 * same interface — zero changes to callers.
 */
export interface Scraper {
  readonly store: StoreId;
  /** Returns true if this scraper handles the given URL. */
  matches(url: string): boolean;
  /** Extracts real product data. Throws on hard failure (network, etc). */
  scrape(url: string): Promise<ScrapedProduct>;
}

/** Detect the store from a URL (used by the registry + UI labels). */
export function detectStore(url: string): StoreId {
  const u = url.toLowerCase();
  if (u.includes("amazon.") || u.includes("amzn.")) return "amazon";
  if (u.includes("temu.com")) return "temu";
  if (u.includes("falabella.com")) return "falabella";
  return "other";
}
