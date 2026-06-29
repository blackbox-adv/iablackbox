// GET /api/search?q= — search products + AI-analyzed intent
import { NextRequest, NextResponse } from "next/server";
import { fetchProducts } from "@/lib/api-helpers";
import { analyzeSearchIntent } from "@/lib/ai";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (!q) {
      return NextResponse.json({ products: [], intent: null });
    }

    const { products } = await fetchProducts({
      q,
      limit: 24,
      offset: 0,
      withRelations: true,
    });

    let intent: { intent: string; suggestedCategory: string | null; keywords: string[] } | null = null;
    try {
      intent = await analyzeSearchIntent(q);
    } catch (err) {
      console.error("analyzeSearchIntent failed:", err);
      intent = null;
    }

    return NextResponse.json({ products, intent });
  } catch (err) {
    console.error("GET /api/search failed:", err);
    return NextResponse.json(
      { error: "Failed to search products" },
      { status: 500 }
    );
  }
}
