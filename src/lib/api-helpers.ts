// BLACKBOX API shared helpers — parse DB rows and fetch products with relations.
import { db } from "@/lib/db";
import type { Product, Offer, AiScore } from "@/lib/types";

/**
 * Parse a raw Prisma Product row into a clean Product by JSON-parsing the
 * stringified array/object fields (SQLite limitation).
 */
export function parseProduct(p: any): Product {
  let images: string[] = [];
  let features: string[] = [];
  let specs: Record<string, string> = {};
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
