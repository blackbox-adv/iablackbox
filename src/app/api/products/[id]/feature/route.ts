// PUT /api/products/[id]/feature — toggle the product's isFeatured flag.
// Body: { isFeatured: boolean }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchProductWithRelations } from "@/lib/api-helpers";

interface FeatureBody {
  isFeatured: boolean;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as FeatureBody | null;
    if (!body || typeof body.isFeatured !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid 'isFeatured' (must be boolean)" },
        { status: 400 }
      );
    }

    const existing = await db.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    await db.product.update({
      where: { id },
      data: { isFeatured: body.isFeatured },
    });

    const product = await fetchProductWithRelations(id);
    return NextResponse.json({ product });
  } catch (err) {
    console.error("PUT /api/products/[id]/feature failed:", err);
    return NextResponse.json(
      { error: "Failed to toggle featured flag" },
      { status: 500 }
    );
  }
}
