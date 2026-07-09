// POST /api/products/contribute — PUBLIC endpoint where users submit a product
// URL when a search returned no results. The contributed product is created in
// "pending" state (not visible until an admin reviews/approves it).
//
// Flow:
//   1. Validate URL (must start with http).
//   2. Resolve the client IP (x-forwarded-for / x-vercel-forwarded-for / "unknown").
//   3. Rate-limit: max 3 user-contributed products per IP per 24h.
//   4. Scrape real data (static → headless fallback). 422 on no-data.
//   5. Run analyzeProduct() with the configured AI tone.
//   6. Persist Product (contributionStatus="pending", contributionSource="user",
//      contributorIp=ip, isActive=false) + Offer + PriceHistory + AiScore.
//   7. Return { product, status: "pending" } with 201.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  fetchProductWithRelations,
  getAiTone,
  ensureUniqueSlug,
} from "@/lib/api-helpers";
import {
  scrapeUrl,
  assertHasProductData,
  NoProductDataError,
} from "@/lib/scraper";
import { headlessScrape, isHeadlessAvailable } from "@/lib/scraper/headless";
import { scrapedToAnalysisInput, analyzeProduct } from "@/lib/ai-analysis";

const MAX_PER_IP_PER_DAY = 3;

interface ContributeBody {
  url: string;
}

function resolveClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd && fwd.trim()) {
    // x-forwarded-for may be a comma-separated chain; first entry is the client.
    return fwd.split(",")[0].trim();
  }
  const vFwd = req.headers.get("x-vercel-forwarded-for");
  if (vFwd && vFwd.trim()) {
    return vFwd.split(",")[0].trim();
  }
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as ContributeBody | null;
    const url = body?.url?.trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json(
        { error: "URL inválida. Debe comenzar con http://" },
        { status: 400 }
      );
    }

    const ip = resolveClientIp(req);

    // ---- Rate limit: max N user contributions per IP per 24h ----
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await db.product.count({
      where: {
        contributionSource: "user",
        contributorIp: ip,
        createdAt: { gt: since },
      },
    });
    if (recentCount >= MAX_PER_IP_PER_DAY) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de ${MAX_PER_IP_PER_DAY} aportes por día. Intenta de nuevo más tarde.`,
        },
        { status: 429 }
      );
    }

    // ---- Scrape (static → headless fallback) ----
    let scraped;
    try {
      scraped = await scrapeUrl(url);
    } catch (err) {
      console.error("POST /api/products/contribute static scrape failed:", err);
      scraped = null;
    }

    if (scraped) {
      try {
        assertHasProductData(scraped);
      } catch (err) {
        if (err instanceof NoProductDataError) {
          // Static scrape returned an empty shell — try headless.
          if (isHeadlessAvailable()) {
            try {
              const headlessData = await headlessScrape(url);
              try {
                assertHasProductData(headlessData);
                scraped = headlessData;
              } catch {
                // Headless also returned nothing — fall through to the error below.
              }
            } catch (herr) {
              console.error(
                "POST /api/products/contribute headless scrape failed:",
                herr
              );
            }
          }
          // Re-check: if still no data, return the clear error.
          try {
            assertHasProductData(scraped);
          } catch (err2) {
            if (err2 instanceof NoProductDataError) {
              return NextResponse.json(
                {
                  error:
                    "No pudimos leer los datos del producto en esa página. La tienda puede estar bloqueando la lectura automática. Si conoces el producto, puedes proponerlo más tarde o contactar al equipo.",
                },
                { status: 422 }
              );
            }
            throw err2;
          }
        } else {
          throw err;
        }
      }
    }

    if (!scraped) {
      return NextResponse.json(
        {
          error:
            "No se pudo obtener la página del producto. Verifica el enlace e intenta de nuevo.",
        },
        { status: 422 }
      );
    }

    // ---- AI analysis (real data only) ----
    const tone = await getAiTone();
    const { analysisInput } = scrapedToAnalysisInput(scraped, []);
    const analysis = await analyzeProduct(analysisInput, tone);

    // ---- Persist Product (pending + inactive until admin approval) ----
    const slug = await ensureUniqueSlug(analysis.slug);

    const product = await db.product.create({
      data: {
        name: scraped.name ?? "Producto aportado",
        description: scraped.description ?? "",
        category: scraped.category ?? "Tecnología",
        brand: scraped.brand,
        images: JSON.stringify(scraped.images),
        features: JSON.stringify(scraped.features),
        specs: JSON.stringify(scraped.specs),
        sourceUrl: url,
        sourceStore: scraped.sourceStore,
        slug,
        // Pending + invisible until an admin approves.
        contributionStatus: "pending",
        contributionSource: "user",
        contributorIp: ip,
        isActive: false,
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

    // ---- Source-store offer + PriceHistory (only if a price was scraped) ----
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

    // ---- AI score ----
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

    const full = await fetchProductWithRelations(product.id);
    if (!full) {
      return NextResponse.json(
        { error: "Failed to load contributed product" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        product: full,
        status: "pending",
        message:
          "Gracias por tu aporte. Queda pendiente de revisión por el equipo y se publicará cuando sea aprobado.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/products/contribute failed:", err);
    return NextResponse.json(
      { error: "No se pudo procesar tu aporte. Intenta más tarde." },
      { status: 500 }
    );
  }
}
