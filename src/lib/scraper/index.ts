// Scraper registry — the single entry point. Picks the right scraper by URL.
// To add a store: implement `Scraper` and register it below. To switch to an
// official API adapter later: implement the same `Scraper` interface and swap
// it in — zero changes to API routes or UI.

import type { Scraper, StoreId, ScrapedProduct } from "./types";
import { detectStore } from "./types";
import { amazonScraper } from "./amazon";
import { temuScraper } from "./temu";
import { falabellaScraper } from "./falabella";
import { genericScraper } from "./generic";

// Order matters: store-specific first, generic last (matches everything).
const REGISTRY: Scraper[] = [amazonScraper, temuScraper, falabellaScraper, genericScraper];

/** Find the scraper that handles this URL. */
export function getScraper(url: string): Scraper {
  return REGISTRY.find((s) => s.matches(url)) ?? genericScraper;
}

/** Convenience: which store does this URL belong to? */
export function storeOf(url: string): StoreId {
  return detectStore(url);
}

/**
 * Scrape a real product URL. Returns real data only — null fields mean the
 * data could not be found. Never invents values.
 */
export async function scrapeUrl(url: string): Promise<ScrapedProduct> {
  const scraper = getScraper(url);
  return scraper.scrape(url);
}

export type { ScrapedProduct, Scraper, StoreId } from "./types";
