// BLACKBOX API shared helpers — parse DB rows and fetch products with relations.
import { db } from "@/lib/db";
import type { Product, Offer, AiScore, AiTone, Faq } from "@/lib/types";
import { scrapeUrl, assertHasProductData } from "@/lib/scraper";
import {
  analyzeProduct,
  scrapedToAnalysisInput,
} from "@/lib/ai-analysis";
import type { ScrapedProduct } from "@/lib/scraper/types";

/**
 * Parse a raw Prisma Product row into a clean Product by JSON-parsing the
 * stringified array/object fields (SQLite limitation).
 */
export function parseProduct(p: any): Product {
  let images: string[] = [];
  let features: string[] = [];
  let specs: Record<string, string> = {};
  let advantages: string[] = [];
  let disadvantages: string[] = [];
  let useCases: string[] = [];
  let faqs: Faq[] = [];
  try {
    images = Array.isArray(p.images) ? p.images : JSON.parse(p.images ?? "[]");
  } catch {
    images = [];
  }
  try {
    features = Array.isArray(p.features)
      ? p.features
      : JSON.parse(p.features ?? "[]");
  } catch {
    features = [];
  }
  try {
    specs = typeof p.specs === "object" ? p.specs : JSON.parse(p.specs ?? "{}");
  } catch {
    specs = {};
  }
  try {
    advantages = Array.isArray(p.advantages)
      ? p.advantages
      : JSON.parse(p.advantages ?? "[]");
  } catch {
    advantages = [];
  }
  try {
    disadvantages = Array.isArray(p.disadvantages)
      ? p.disadvantages
      : JSON.parse(p.disadvantages ?? "[]");
  } catch {
    disadvantages = [];
  }
  try {
    useCases = Array.isArray(p.useCases)
      ? p.useCases
      : JSON.parse(p.useCases ?? "[]");
  } catch {
    useCases = [];
  }
  try {
    faqs = Array.isArray(p.faqs) ? p.faqs : JSON.parse(p.faqs ?? "[]");
  } catch {
    faqs = [];
  }

  const offers: Offer[] | undefined = p.offers
    ? p.offers.map((o: any) => ({
        id: o.id,
        productId: o.productId,
        store: o.store,
        price: o.price,
        originalPrice: o.originalPrice ?? null,
        affiliateLink: o.affiliateLink,
        shippingTime: o.shippingTime,
        shippingCost: o.shippingCost,
        availability: o.availability,
        rating: o.rating ?? null,
        reviewCount: o.reviewCount,
        updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt),
      }))
    : undefined;

  const aiScore: AiScore | null | undefined = p.aiScores && p.aiScores.length > 0
    ? mapAiScore(p.aiScores[0])
    : p.aiScore
      ? mapAiScore(p.aiScore)
      : undefined;

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    brand: p.brand ?? null,
    images,
    features,
    specs,
    isActive: p.isActive,
    isViral: p.isViral,
    // V2 sourcing & SEO
    sourceUrl: p.sourceUrl ?? null,
    sourceStore: p.sourceStore ?? null,
    slug: p.slug ?? null,
    isFeatured: p.isFeatured ?? false,
    lastFetchedAt:
      p.lastFetchedAt instanceof Date
        ? p.lastFetchedAt.toISOString()
        : p.lastFetchedAt != null
          ? String(p.lastFetchedAt)
          : null,
    metaTitle: p.metaTitle ?? null,
    metaDescription: p.metaDescription ?? null,
    // V2 AI analysis
    advantages,
    disadvantages,
    useCases,
    faqs,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    offers,
    aiScore,
  };
}

function mapAiScore(s: any): AiScore {
  return {
    id: s.id,
    productId: s.productId,
    score: s.score,
    classification: s.classification,
    reasoning: s.reasoning,
    recommendation: s.recommendation ?? null,
    bestStore: s.bestStore ?? null,
    summary: s.summary ?? null,
    updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
  };
}

const PRODUCT_INCLUDE = {
  offers: { orderBy: { price: "asc" as const } },
  aiScores: { orderBy: { updatedAt: "desc" as const }, take: 1 },
};

/**
 * Fetch a single product with its offers (price asc) and latest AiScore.
 */
export async function fetchProductWithRelations(
  id: string
): Promise<Product | null> {
  const p = await db.product.findUnique({
    where: { id },
    include: PRODUCT_INCLUDE,
  });
  if (!p) return null;
  return parseProduct(p);
}

export interface FetchProductsOpts {
  category?: string;
  q?: string;
  viral?: boolean;
  limit?: number;
  offset?: number;
  withRelations?: boolean;
}

/**
 * Normalize text for accent-insensitive, case-insensitive search.
 * Strips diacritics (á→a, é→e, ñ→n, …) and lowercases.
 */
function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Fetch a filtered list of products. Always filters isActive=true.
 * Supports category (exact), q (accent-insensitive search on
 * name/description/brand/category/features), and viral flag.
 * Returns products + total count.
 */
export async function fetchProducts(
  opts: FetchProductsOpts
): Promise<{ products: Product[]; total: number }> {
  const {
    category,
    q,
    viral,
    limit = 24,
    offset = 0,
    withRelations = true,
  } = opts;

  const where: any = { isActive: true };
  if (category) where.category = category;
  if (typeof viral === "boolean") where.isViral = viral;

  const include = withRelations ? PRODUCT_INCLUDE : undefined;

  if (q && q.trim()) {
    // Accent-insensitive search: fetch all matching category/viral, then
    // filter in JS with diacritic normalization (SQLite has no accent folding).
    const norm = normalizeText(q.trim());
    const allRows = await db.product.findMany({
      where,
      include,
      orderBy: { updatedAt: "desc" },
    });
    const filtered = allRows.filter((p) =>
      normalizeText(
        [p.name, p.description, p.brand ?? "", p.category, p.features].join(" ")
      ).includes(norm)
    );
    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);
    return { products: paged.map(parseProduct), total };
  }

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      include,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.product.count({ where }),
  ]);

  return { products: rows.map(parseProduct), total };
}

// ---------- V2: refresh / re-scrape shared logic ----------

/**
 * Read the configured AI tone from the AiSetting table (default "simple").
 */
export async function getAiTone(): Promise<AiTone> {
  const setting = await db.aiSetting.findUnique({
    where: { key: "ai_tone" },
  });
  const value = setting?.value;
  if (
    value === "simple" ||
    value === "tecnico" ||
    value === "vendedor" ||
    value === "neutral"
  ) {
    return value;
  }
  return "simple";
}

/**
 * Ensure a slug is unique. If `slug` already exists on another product,
 * append `-2`, `-3`, … until a free slug is found.
 */
export async function ensureUniqueSlug(
  slug: string,
  excludeProductId?: string
): Promise<string> {
  const base = slug || "producto";
  let candidate = base;
  let suffix = 2;
  // Loop until we find a slug not used by another product.
  for (;;) {
    const existing = await db.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeProductId) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
    // Safety valve to avoid infinite loops.
    if (suffix > 1000) return `${base}-${Date.now()}`;
  }
}

/**
 * Re-fetch a product's sourceUrl and update changed fields in DB.
 * Used by POST /api/products/[id]/refresh and POST /api/products/bulk-refresh.
 *
 * Returns the refreshed Product (with relations), or throws on hard failure.
 */
export async function refreshProduct(
  id: string
): Promise<Product> {
  // 1. Get the product with offers + aiScores.
  const product = await db.product.findUnique({
    where: { id },
    include: {
      offers: true,
      aiScores: true,
    },
  });
  if (!product) {
    throw new Error("Product not found");
  }
  if (!product.sourceUrl) {
    throw new Error("Product has no sourceUrl to refresh");
  }

  // 2. Re-scrape.
  const scraped: ScrapedProduct = await scrapeUrl(product.sourceUrl);

  // 2b. Guard: if the store now returns no product data (blocked / JS-only),
  // surface a clear error rather than wiping the existing product with nulls.
  assertHasProductData(scraped);

  // 3. Build analysis input from scraped + EXISTING offers (filter out the
  //    source store's old offer, since we're replacing it).
  const existingOffers: Offer[] = product.offers
    .filter((o) => o.store !== scraped.sourceStore)
    .map((o) => ({
      id: o.id,
      productId: o.productId,
      store: o.store,
      price: o.price,
      originalPrice: o.originalPrice ?? null,
      affiliateLink: o.affiliateLink,
      shippingTime: o.shippingTime,
      shippingCost: o.shippingCost,
      availability: o.availability,
      rating: o.rating ?? null,
      reviewCount: o.reviewCount,
      updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt),
    }));

  const tone = await getAiTone();
  const { analysisInput } = scrapedToAnalysisInput(scraped, existingOffers);
  const analysis = await analyzeProduct(analysisInput, tone);

  // 4. Update Product fields (only non-null scraped values).
  const data: Record<string, unknown> = {
    lastFetchedAt: new Date(),
    advantages: JSON.stringify(analysis.advantages),
    disadvantages: JSON.stringify(analysis.disadvantages),
    useCases: JSON.stringify(analysis.useCases),
    faqs: JSON.stringify(analysis.faqs),
    metaTitle: analysis.metaTitle,
    metaDescription: analysis.metaDescription,
  };
  if (scraped.name != null) data.name = scraped.name;
  if (scraped.description != null) data.description = scraped.description;
  if (scraped.brand != null) data.brand = scraped.brand;
  if (scraped.category != null) data.category = scraped.category;
  if (scraped.images.length > 0) data.images = JSON.stringify(scraped.images);
  if (scraped.features.length > 0) data.features = JSON.stringify(scraped.features);
  if (Object.keys(scraped.specs).length > 0) data.specs = JSON.stringify(scraped.specs);
  // Refresh slug from AI analysis only if it changed and is unique.
  if (analysis.slug && analysis.slug !== product.slug) {
    data.slug = await ensureUniqueSlug(analysis.slug, product.id);
  }

  await db.product.update({ where: { id }, data });

  // 5. Handle source store's offer: upsert by productId+store=sourceStore.
  if (scraped.price != null) {
    const existingOffer = product.offers.find(
      (o) => o.store === scraped.sourceStore
    );
    const offerData = {
      price: scraped.price,
      originalPrice: scraped.originalPrice,
      affiliateLink: scraped.sourceUrl,
      shippingTime: scraped.shippingTime ?? "No disponible",
      shippingCost: scraped.shippingCost ?? 0,
      availability: scraped.availability,
      rating: scraped.rating,
      reviewCount: scraped.reviewCount ?? 0,
      currency: scraped.currency ?? "PEN",
      updatedAt: new Date(),
    };
    if (existingOffer) {
      await db.offer.update({
        where: { id: existingOffer.id },
        data: offerData,
      });
    } else {
      await db.offer.create({
        data: {
          productId: id,
          store: scraped.sourceStore,
          ...offerData,
        },
      });
    }

    // Record PriceHistory entry.
    await db.priceHistory.create({
      data: {
        productId: id,
        store: scraped.sourceStore,
        price: scraped.price,
        currency: scraped.currency ?? "PEN",
        recordedAt: new Date(),
      },
    });
  }

  // 6. Refresh AiScore: delete old + create new.
  if (product.aiScores.length > 0) {
    await db.aiScore.deleteMany({
      where: { productId: id },
    });
  }
  await db.aiScore.create({
    data: {
      productId: id,
      score: analysis.score,
      classification: analysis.classification,
      reasoning: analysis.reasoning,
      recommendation: analysis.recommendation,
      bestStore: analysis.bestStore,
      summary: analysis.summary,
    },
  });

  // 7. Return refreshed product with relations.
  const refreshed = await fetchProductWithRelations(id);
  if (!refreshed) {
    throw new Error("Failed to load refreshed product");
  }
  return refreshed;
}
