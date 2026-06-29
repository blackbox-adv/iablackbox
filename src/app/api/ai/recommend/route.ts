// POST /api/ai/recommend — ephemeral AI recommendation block for a product
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRecommendation } from "@/lib/ai";
import type { AiTone, Store, Availability } from "@/lib/types";

interface RecommendBody {
  productId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RecommendBody;
    if (!body?.productId) {
      return NextResponse.json(
        { error: "Missing 'productId' field" },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: { id: body.productId },
      include: { offers: { orderBy: { price: "asc" } } },
    });
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    let features: string[] = [];
    try {
      features = JSON.parse(product.features ?? "[]");
    } catch {
      features = [];
    }

    const offers = product.offers.map((o) => ({
      id: o.id,
      productId: o.productId,
      store: o.store as Store,
      price: o.price,
      originalPrice: o.originalPrice ?? null,
      affiliateLink: o.affiliateLink,
      shippingTime: o.shippingTime,
      shippingCost: o.shippingCost,
      availability: o.availability as Availability,
      rating: o.rating ?? null,
      reviewCount: o.reviewCount,
      updatedAt: o.updatedAt.toISOString(),
    }));

    const toneSetting = await db.aiSetting.findUnique({
      where: { key: "ai_tone" },
    });
    const tone = (toneSetting?.value as AiTone) ?? "simple";

    const result = await generateRecommendation(
      {
        productName: product.name,
        description: product.description,
        features,
        offers,
      },
      tone
    );

    return NextResponse.json({
      summary: result.summary,
      bestOption: result.bestOption,
      cheapAlternative: result.cheapAlternative,
      premiumAlternative: result.premiumAlternative,
    });
  } catch (err) {
    console.error("POST /api/ai/recommend failed:", err);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}
