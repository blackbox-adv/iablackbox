// POST /api/scrape — on-demand synthetic scrape for a product not in DB.
// Body: { query: string, store?: string }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchProductWithRelations } from "@/lib/api-helpers";
import { generateAiScore } from "@/lib/ai";
import type { AiTone, Store } from "@/lib/types";

const STORES: Store[] = ["amazon", "temu", "falabella"];

function inferCategory(query: string): string {
  const q = query.toLowerCase();
  if (/(audifono|audífono|bluetooth|earbud|auricular|auriculares)/.test(q)) return "Audio";
  if (/(teclado|mouse|ratón|gamer|gaming|joystick)/.test(q)) return "Gaming";
  if (/(cargador|usb|power ?bank|bateria|batería|cable)/.test(q)) return "Accesorios móviles";
  if (/(tablet)/.test(q)) return "Tecnología";
  if (/(ventilador|gadget)/.test(q)) return "Gadgets virales";
  return "Tecnología";
}

function basePriceForCategory(cat: string): number {
  switch (cat) {
    case "Audio":
      return 90;
    case "Gaming":
      return 80;
    case "Accesorios móviles":
      return 60;
    case "Gadgets virales":
      return 30;
    default:
      return 150;
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shippingTimeFor(store: Store): string {
  switch (store) {
    case "amazon":
      return "1-2 días";
    case "temu":
      return "8-15 días";
    case "falabella":
      return "2-4 días";
  }
}

interface ScrapeBody {
  query: string;
  store?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScrapeBody;
    const query = (body?.query ?? "").trim();
    if (!query) {
      return NextResponse.json(
        { error: "Missing 'query' field" },
        { status: 400 }
      );
    }

    // Freshness check: existing product with similar name updated < 24h ago.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await db.product.findFirst({
      where: {
        name: { contains: query },
        updatedAt: { gte: cutoff },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (recent) {
      const existing = await fetchProductWithRelations(recent.id);
      if (existing) {
        return NextResponse.json({ product: existing });
      }
    }

    // Build synthetic product
    const category = inferCategory(query);
    const base = basePriceForCategory(category);
    const capitalizedName = query
      .split(/\s+/)
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");

    const description = `Producto "${query}" encontrado mediante scraping. Compara precios entre Amazon, Temu y Falabella con análisis IA.`;
    const features = [
      `Categoría: ${category}`,
      "Comparación de precios en 3 tiendas",
      "Análisis IA con score de compra",
    ];

    const product = await db.product.create({
      data: {
        name: capitalizedName,
        description,
        category,
        brand: "Scraped",
        images: JSON.stringify([]),
        features: JSON.stringify(features),
        specs: JSON.stringify({}),
        isViral: false,
        isActive: true,
      },
    });

    // 3 synthetic offers: amazon=base, temu=base*0.6, falabella=base*1.2
    const original = +(base * 1.4).toFixed(2);
    const storePrices: Record<Store, number> = {
      amazon: +base.toFixed(2),
      temu: +(base * 0.6).toFixed(2),
      falabella: +(base * 1.2).toFixed(2),
    };

    for (const store of STORES) {
      const price = storePrices[store];
      const rating = +(3.9 + Math.random() * 0.6).toFixed(1);
      const reviewCount = randomInt(50, 5000);
      await db.offer.create({
        data: {
          productId: product.id,
          store,
          price,
          originalPrice: original,
          affiliateLink: `https://${store}.com/s?k=${encodeURIComponent(query)}`,
          shippingTime: shippingTimeFor(store),
          shippingCost: 0,
          availability: "in_stock",
          rating,
          reviewCount,
          updatedAt: new Date(),
        },
      });
    }

    // Generate AI score (with fallback)
    const toneSetting = await db.aiSetting.findUnique({
      where: { key: "ai_tone" },
    });
    const tone = (toneSetting?.value as AiTone) ?? "simple";

    let aiResult = null;
    try {
      const offers = await db.offer.findMany({
        where: { productId: product.id },
        orderBy: { price: "asc" },
      });
      aiResult = await generateAiScore(
        {
          productName: capitalizedName,
          description,
          features,
          offers: offers.map((o) => ({
            id: o.id,
            productId: o.productId,
            store: o.store as Store,
            price: o.price,
            originalPrice: o.originalPrice ?? null,
            affiliateLink: o.affiliateLink,
            shippingTime: o.shippingTime,
            shippingCost: o.shippingCost,
            availability: o.availability as any,
            rating: o.rating ?? null,
            reviewCount: o.reviewCount,
            updatedAt: o.updatedAt.toISOString(),
          })),
        },
        tone
      );

      await db.aiScore.create({
        data: {
          productId: product.id,
          score: aiResult.score,
          classification: aiResult.classification,
          reasoning: aiResult.reasoning,
          recommendation: aiResult.recommendation,
          bestStore: aiResult.bestStore,
          summary: aiResult.summary,
        },
      });
    } catch (err) {
      console.error("Scrape AI score generation failed:", err);
    }

    const full = await fetchProductWithRelations(product.id);
    if (!full) {
      return NextResponse.json(
        { error: "Failed to load scraped product" },
        { status: 500 }
      );
    }
    return NextResponse.json({ product: full }, { status: 201 });
  } catch (err) {
    console.error("POST /api/scrape failed:", err);
    return NextResponse.json(
      { error: "Failed to scrape product" },
      { status: 500 }
    );
  }
}
