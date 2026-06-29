// GET /api/admin/scheduled-offers — list all scheduled offers (with product name).
// POST /api/admin/scheduled-offers — create a new scheduled offer.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface ScheduledOfferWithProduct {
  id: string;
  productId: string;
  productName: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

function mapOffer(o: any): ScheduledOfferWithProduct {
  return {
    id: o.id,
    productId: o.productId,
    productName: o.product?.name ?? "",
    label: o.label,
    startDate:
      o.startDate instanceof Date ? o.startDate.toISOString() : String(o.startDate),
    endDate:
      o.endDate instanceof Date ? o.endDate.toISOString() : String(o.endDate),
    isActive: o.isActive,
    createdAt:
      o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
  };
}

export async function GET() {
  try {
    const rows = await db.scheduledOffer.findMany({
      include: { product: { select: { name: true } } },
      orderBy: { startDate: "asc" },
    });
    const offers = rows.map(mapOffer);
    return NextResponse.json({ offers });
  } catch (err) {
    console.error("GET /api/admin/scheduled-offers failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch scheduled offers" },
      { status: 500 }
    );
  }
}

interface CreateBody {
  productId: string;
  label: string;
  startDate: string;
  endDate: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as CreateBody | null;
    if (!body?.productId || !body.label || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Missing required fields: productId, label, startDate, endDate" },
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

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate or endDate" },
        { status: 400 }
      );
    }

    const created = await db.scheduledOffer.create({
      data: {
        productId: body.productId,
        label: body.label,
        startDate,
        endDate,
        isActive: true,
      },
      include: { product: { select: { name: true } } },
    });

    return NextResponse.json({ offer: mapOffer(created) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/scheduled-offers failed:", err);
    return NextResponse.json(
      { error: "Failed to create scheduled offer" },
      { status: 500 }
    );
  }
}
