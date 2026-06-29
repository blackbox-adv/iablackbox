// POST /api/clicks — record affiliate click
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface ClickBody {
  productId: string;
  store?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ClickBody;
    if (!body?.productId) {
      return NextResponse.json(
        { error: "Missing 'productId' field" },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: { id: body.productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    await db.click.create({
      data: {
        productId: body.productId,
        store: body.store ?? null,
        userId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/clicks failed:", err);
    return NextResponse.json(
      { error: "Failed to record click" },
      { status: 500 }
    );
  }
}
