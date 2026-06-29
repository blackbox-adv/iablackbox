// POST /api/products/import — import a real product from a store URL.
// Real-data-only: scrapes the URL, runs full V2 AI analysis, persists
// Product + Offer + PriceHistory + AiScore.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  fetchProductWithRelations,
  getAiTone,
  ensureUniqueSlug,
} from "@/lib/api-helpers";
import { scrapeUrl } from "@/lib/scraper";
import { scrapedToAnalysisInput, analyzeProduct } from "@/lib/ai-analysis";

interface ImportBody {
  url: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as ImportBody | null;
    const url = body?.url?.trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json(
        { error: "Invalid or missing 'url' (must start with http)" },
        { status: 400 }
      );
    }

    // 2. Scrape real data.
    let scraped;
    try {
      scraped = await scrapeUrl(url);
    } catch (err) {
      console.error("POST /api/products/import scrape failed:", err);
      const msg = err instanceof Error ? err.message : "Scrape failed";
      return NextResponse.json(
        { error: `Failed to scrape URL: ${msg}` },
        { status: 500 }
      );
    }

    // 3. AI tone setting.
    const tone = await getAiTone();

    // 4-5. Build analysis input + run analysis.
    const { analysisInput } = scrapedToAnalysisInput(scraped, []);
    const analysis = await analyzeProduct(analysisInput, tone);

    // 6. Create the Product with all real + AI fields.
    const slug = await ensureUniqueSlug(analysis.slug);

    const product = await db.product.create({
      data: {
        name: scraped.name ?? "Producto importado",
        description: scraped.description ?? "",
        category: scraped.category ?? "Tecnología",
        brand: scraped.brand,
        images: JSON.stringify(scraped.images),
        features: JSON.stringify(scraped.features),
        specs: JSON.stringify(scraped.specs),
        sourceUrl: url,
        sourceStore: scraped.sourceStore,
        slug,
        isActive: true,
        isFeatured: false,
        lastFetchedAt: new Date(),
        metaTitle: analysis.metaTitle,
        metaDescription: analysis.metaDescription,
        advantages: JSON.stringify(analysis.advantages),
        disadvantages: JSON.stringify(analysis.disadvantages),
        useCases: JSON.stringify(analysis.useCases),
        faqs: JSON.stringify(analysis.faqs),
      },
    });

    // 7. If scraped has a price, create the source-store offer + a PriceHistory.
    if (scraped.price != null) {
      await db.offer.create({
        data: {
          productId: product.id,
          store: scraped.sourceStore,
          price: scraped.price,
          originalPrice: scraped.originalPrice,
          affiliateLink: url,
          shippingTime: scraped.shippingTime ?? "No disponible",
          shippingCost: scraped.shippingCost ?? 0,
          availability: scraped.availability,
          rating: scraped.rating,
          reviewCount: scraped.reviewCount ?? 0,
          currency: scraped.currency ?? "PEN",
          updatedAt: new Date(),
        },
      });

      await db.priceHistory.create({
        data: {
          productId: product.id,
          store: scraped.sourceStore,
          price: scraped.price,
          currency: scraped.currency ?? "PEN",
          recordedAt: new Date(),
        },
      });
    }

    // 8. Create AiScore.
    await db.aiScore.create({
      data: {
        productId: product.id,
        score: analysis.score,
        classification: analysis.classification,
        reasoning: analysis.reasoning,
        recommendation: analysis.recommendation,
        bestStore: analysis.bestStore,
        summary: analysis.summary,
      },
    });

    // 9. Return with relations.
    const full = await fetchProductWithRelations(product.id);
    if (!full) {
      return NextResponse.json(
        { error: "Failed to load imported product" },
        { status: 500 }
      );
    }
    return NextResponse.json({ product: full }, { status: 201 });
  } catch (err) {
    console.error("POST /api/products/import failed:", err);
    return NextResponse.json(
      { error: "Failed to import product" },
      { status: 500 }
    );
  }
}
