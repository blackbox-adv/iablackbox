// GET /api/products — list/filter products
// POST /api/products — admin create product
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchProducts, parseProduct } from "@/lib/api-helpers";
import type { Product } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? undefined;
    const q = searchParams.get("q") ?? undefined;
    const viralParam = searchParams.get("viral");
    const viral =
      viralParam === "1" || viralParam === "true" ? true : undefined;
    const limit = Number(searchParams.get("limit") ?? "24") || 24;
    const offset = Number(searchParams.get("offset") ?? "0") || 0;

    const { products, total } = await fetchProducts({
      category,
      q,
      viral,
      limit,
      offset,
      withRelations: true,
    });

    return NextResponse.json({ products, total });
  } catch (err) {
    console.error("GET /api/products failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

interface CreateProductBody {
  name: string;
  description: string;
  category: string;
  brand?: string | null;
  images?: string[];
  features?: string[];
  specs?: Record<string, string>;
  isViral?: boolean;
  sourceUrl?: string | null;
  // Optional: create an offer (price + affiliate link) in the same request.
  // Used by the manual fallback when scraping fails — the affiliate link is
  // the monetization, so we always save it.
  offer?: {
    price?: number | null;
    originalPrice?: number | null;
    affiliateLink?: string;
    shippingTime?: string;
    availability?: string;
    currency?: string;
  } | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateProductBody;
    if (!body.name || !body.description || !body.category) {
      return NextResponse.json(
        { error: "Missing required fields: name, description, category" },
        { status: 400 }
      );
    }

    const images = body.images ?? [];
    const features = body.features ?? [];
    const specs = body.specs ?? {};

    // Detect store from sourceUrl if provided
    let sourceStore: string | null = null;
    if (body.sourceUrl) {
      const u = body.sourceUrl.toLowerCase();
      if (u.includes("amazon.") || u.includes("amzn.")) sourceStore = "amazon";
      else if (u.includes("temu.com") || u.includes("temu.to")) sourceStore = "temu";
      else if (u.includes("falabella.com")) sourceStore = "falabella";
      else sourceStore = "other";
    }

    const created = await db.product.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        brand: body.brand ?? null,
        images: JSON.stringify(images),
        features: JSON.stringify(features),
        specs: JSON.stringify(specs),
        isViral: body.isViral ?? false,
        isActive: true,
        sourceUrl: body.sourceUrl ?? null,
        sourceStore,
      },
      include: {
        offers: { orderBy: { price: "asc" } },
        aiScores: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });

    // Create an offer if the admin provided price/affiliate link (manual fallback)
    if (body.offer && sourceStore) {
      const o = body.offer;
      await db.offer.create({
        data: {
          productId: created.id,
          store: sourceStore,
          price: o.price ?? 0,
          originalPrice: o.originalPrice ?? null,
          affiliateLink: o.affiliateLink ?? body.sourceUrl ?? "",
          shippingTime: o.shippingTime ?? "No disponible",
          shippingCost: 0,
          availability: o.availability ?? "in_stock",
          currency: o.currency ?? "PEN",
          updatedAt: new Date(),
        },
      });
      // Record initial price history if there's a real price
      if (o.price != null && o.price > 0) {
        await db.priceHistory.create({
          data: {
            productId: created.id,
            store: sourceStore,
            price: o.price,
            currency: o.currency ?? "PEN",
            recordedAt: new Date(),
          },
        });
      }
      // Re-fetch with the new offer
      const withOffer = await db.product.findUnique({
        where: { id: created.id },
        include: {
          offers: { orderBy: { price: "asc" } },
          aiScores: { orderBy: { updatedAt: "desc" }, take: 1 },
        },
      });
      if (withOffer) {
        const product: Product = parseProduct(withOffer);
        return NextResponse.json({ product }, { status: 201 });
      }
    }

    const product: Product = parseProduct(created);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error("POST /api/products failed:", err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
