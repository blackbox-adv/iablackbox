// GET /api/home — home page composition: sections, featured, recommendations, categories
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseProduct } from "@/lib/api-helpers";
import type { HomeSection } from "@/lib/types";

const PRODUCT_INCLUDE = {
  offers: { orderBy: { price: "asc" as const } },
  aiScores: { orderBy: { updatedAt: "desc" as const }, take: 1 },
};

function mapSection(s: any): HomeSection {
  let config: Record<string, unknown> = {};
  try {
    config = typeof s.config === "object" ? s.config : JSON.parse(s.config ?? "{}");
  } catch {
    config = {};
  }
  return {
    id: s.id,
    type: s.type,
    title: s.title,
    subtitle: s.subtitle ?? null,
    isActive: s.isActive,
    order: s.order,
    config,
  };
}

function discountPct(price: number, original?: number | null): number {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

export async function GET(_req: NextRequest) {
  try {
    // sections
    const sectionRows = await db.homeSection.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    const sections = sectionRows.map(mapSection);

    // featured: prioritize isFeatured=true products first, then fall back to
    // discount-based ranking. Limit 8.
    const allProducts = await db.product.findMany({
      where: { isActive: true },
      include: PRODUCT_INCLUDE,
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    });

    const featured = allProducts
      .map(parseProduct)
      .map((p) => {
        const best = (p.offers ?? []).reduce((max, o) => {
          const d = discountPct(o.price, o.originalPrice);
          return d > max ? d : max;
        }, 0);
        return { p, best, isFeatured: p.isFeatured };
      })
      .sort((a, b) => {
        // Featured first, then best discount desc.
        if (a.isFeatured !== b.isFeatured) {
          return a.isFeatured ? -1 : 1;
        }
        return b.best - a.best;
      })
      .slice(0, 8)
      .map((x) => x.p);

    // recommendations: products sorted by their latest aiScore.score desc
    const withScore = allProducts
      .map(parseProduct)
      .filter((p) => p.aiScore)
      .sort((a, b) => (b.aiScore?.score ?? 0) - (a.aiScore?.score ?? 0))
      .slice(0, 6);

    // distinct categories
    const cats = await db.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
    });
    const categories = cats.map((c) => c.category);

    return NextResponse.json({
      sections,
      featured,
      recommendations: withScore,
      categories,
    });
  } catch (err) {
    console.error("GET /api/home failed:", err);
    return NextResponse.json(
      { error: "Failed to load home data" },
      { status: 500 }
    );
  }
}
