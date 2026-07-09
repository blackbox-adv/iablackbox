// GET /api/admin/pending — list products awaiting approval (contributionStatus
// = "pending"), ordered by createdAt DESC. Includes offers + latest aiScore,
// same include pattern as fetchProducts. Uses parseProduct() to JSON-parse
// stringified columns.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseProduct } from "@/lib/api-helpers";

export async function GET(_req: NextRequest) {
  try {
    const rows = await db.product.findMany({
      where: { contributionStatus: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        offers: { orderBy: { price: "asc" } },
        aiScores: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });
    const products = rows.map(parseProduct);
    return NextResponse.json({ products });
  } catch (err) {
    console.error("GET /api/admin/pending failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch pending products" },
      { status: 500 }
    );
  }
}
