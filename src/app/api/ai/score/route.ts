// POST /api/ai/score — regenerate AI score for a product
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAiScore } from "@/lib/ai";
import type { AiScore, AiTone, Store, Availability } from "@/lib/types";

interface ScoreBody {
  productId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScoreBody;
    if (!body?.productId) {
      return NextResponse.json(
        { error: "Missing 'productId' field" },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: { id: body.productId },
      include: {
        offers: { orderBy: { price: "asc" } },
        aiScores: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Parse JSON fields
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

    const result = await generateAiScore(
      {
        productName: product.name,
        description: product.description,
        features,
        offers,
      },
      tone
    );

    // Replace existing AiScores for this product (delete old, create new).
    await db.aiScore.deleteMany({ where: { productId: product.id } });
    const created = await db.aiScore.create({
      data: {
        productId: product.id,
        score: result.score,
        classification: result.classification,
        reasoning: result.reasoning,
        recommendation: result.recommendation,
        bestStore: result.bestStore,
        summary: result.summary,
      },
    });

    const aiScore: AiScore = {
      id: created.id,
      productId: created.productId,
      score: created.score,
      classification: created.classification as AiScore["classification"],
      reasoning: created.reasoning,
      recommendation: created.recommendation ?? null,
      bestStore: created.bestStore ?? null,
      summary: created.summary ?? null,
      updatedAt: created.updatedAt.toISOString(),
    };

    return NextResponse.json({ aiScore });
  } catch (err) {
    console.error("POST /api/ai/score failed:", err);
    return NextResponse.json(
      { error: "Failed to generate AI score" },
      { status: 500 }
    );
  }
}
