// POST /api/products/[id]/reject — reject a user-contributed product.
// Sets contributionStatus="rejected" and isActive=false (it will not be
// visible publicly). Returns { success: true }.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
        contributionStatus: "rejected",
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/products/[id]/reject failed:", err);
    return NextResponse.json(
      { error: "Failed to reject product" },
      { status: 500 }
    );
  }
}
