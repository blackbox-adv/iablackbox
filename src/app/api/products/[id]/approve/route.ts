// POST /api/products/[id]/approve — approve a user-contributed product.
// Sets contributionStatus="approved" and isActive=true so it becomes public
// (and indexable). Returns the product with relations via fetchProductWithRelations.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchProductWithRelations } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      data: {
        contributionStatus: "approved",
        isActive: true,
      },
    });

    const product = await fetchProductWithRelations(id);
    if (!product) {
      return NextResponse.json(
        { error: "Failed to load approved product" },
        { status: 500 }
      );
    }
    return NextResponse.json({ product });
  } catch (err) {
    console.error("POST /api/products/[id]/approve failed:", err);
    return NextResponse.json(
      { error: "Failed to approve product" },
      { status: 500 }
    );
  }
}
