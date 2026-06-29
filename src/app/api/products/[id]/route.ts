// GET /api/products/[id] — single product with relations
// PUT /api/products/[id] — admin update product (partial)
// DELETE /api/products/[id] — admin delete product
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchProductWithRelations, parseProduct } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await fetchProductWithRelations(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch (err) {
    console.error("GET /api/products/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

interface UpdateProductBody {
  name?: string;
  description?: string;
  category?: string;
  brand?: string | null;
  images?: string[];
  features?: string[];
  specs?: Record<string, string>;
  isActive?: boolean;
  isViral?: boolean;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as UpdateProductBody;

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.category === "string") data.category = body.category;
    if (body.brand !== undefined) data.brand = body.brand;
    if (Array.isArray(body.images)) data.images = JSON.stringify(body.images);
    if (Array.isArray(body.features)) data.features = JSON.stringify(body.features);
    if (body.specs !== undefined && typeof body.specs === "object")
      data.specs = JSON.stringify(body.specs);
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body.isViral === "boolean") data.isViral = body.isViral;

    const updated = await db.product.update({
      where: { id },
      data,
      include: {
        offers: { orderBy: { price: "asc" } },
        aiScores: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ product: parseProduct(updated) });
  } catch (err) {
    console.error("PUT /api/products/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/products/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
