// GET /api/categories — distinct active product categories
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  try {
    const rows = await db.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
    });
    const categories = rows.map((r) => r.category);
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("GET /api/categories failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
