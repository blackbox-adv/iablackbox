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
  if (u.includes("temu.com") || u.includes("temu.to")) return "temu";
  if (u.includes("falabella.com")) return "falabella";
  return "other";
}

/**
 * Guard: throw a clear, user-facing error when a scraped page contains NO
 * real product data (e.g. a JS-only SPA like Temu that returns a generic
 * shell, or a 404/blocked page). This prevents creating empty "fake" products.
 *
 * A page is considered to have NO product data when it's missing BOTH a
 * real product name AND a price.
 */
export class NoProductDataError extends Error {
  constructor(store: StoreId, reason: string) {
    const storeLabel =
      store === "temu"
        ? "Temu"
        : store === "amazon"
        ? "Amazon"
        : store === "falabella"
        ? "Falabella"
        : "esta tienda";
    super(
      `${storeLabel} no devolvió datos de producto (${reason}). ` +
        `Esto suele ocurrir cuando la tienda renderiza todo con JavaScript ` +
        `(anti-scraping) o bloquea lectores automáticos. ` +
        `Intenta con un enlace de otra tienda o ingresa el producto manualmente desde el panel de edición.`
    );
    this.name = "NoProductDataError";
  }
}

/**
 * Validate that a ScrapedProduct has enough real data to be worth saving.
 * Throws NoProductDataError if not.
 */
export function assertHasProductData(s: ScrapedProduct): void {
  const hasName = s.name && s.name.trim().length > 0 && !isGenericTitle(s.name);
  const hasPrice = s.price != null;
  if (!hasName && !hasPrice) {
    throw new NoProductDataError(s.sourceStore, "sin nombre de producto ni precio");
  }
  if (!hasName) {
    throw new NoProductDataError(s.sourceStore, "sin nombre de producto");
  }
  if (!hasPrice) {
    // Name exists but no price — still allow (some pages hide price behind JS),
    // but warn. We only hard-fail when BOTH are missing.
  }
}

/** Heuristic: detect generic store-homepage / 404 titles that aren't products. */
function isGenericTitle(name: string): boolean {
  const n = name.toLowerCase().trim();
  const generic = [
    "temu | explore",
    "temu",
    "amazon.com",
    "page not found",
    "documento no encontrado",
    "404",
    "falabella.com",
    "falabella",
    "loading",
    "just a moment", // cloudflare
  ];
  return generic.some((g) => n === g || n.startsWith(g));
}
