// POST /api/products/[id]/refresh — re-fetch the product's sourceUrl and
// update changed fields (price, availability, AI analysis, etc.).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshProduct } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.product.findUnique({
      where: { id },
      select: { id: true, sourceUrl: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    if (!existing.sourceUrl) {
      return NextResponse.json(
        { error: "Product has no sourceUrl to refresh" },
        { status: 400 }
      );
    }

    const product = await refreshProduct(id);
    return NextResponse.json({ product });
  } catch (err) {
    console.error("POST /api/products/[id]/refresh failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to refresh product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
