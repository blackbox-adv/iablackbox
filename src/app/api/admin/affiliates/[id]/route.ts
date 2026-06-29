// PUT /api/admin/affiliates/[id] — update an affiliate config
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AffiliateLink } from "@/lib/types";

interface UpdateBody {
  store?: string;
  baseUrl?: string;
  tagParam?: string | null;
  tagValue?: string | null;
  isActive?: boolean;
}

function mapAffiliate(a: any): AffiliateLink {
  return {
    id: a.id,
    store: a.store,
    baseUrl: a.baseUrl,
    tagParam: a.tagParam ?? null,
    tagValue: a.tagValue ?? null,
    isActive: a.isActive,
  };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as UpdateBody;

    const existing = await db.affiliateLink.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Affiliate not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (typeof body.store === "string") data.store = body.store;
    if (typeof body.baseUrl === "string") data.baseUrl = body.baseUrl;
    if (body.tagParam !== undefined) data.tagParam = body.tagParam;
    if (body.tagValue !== undefined) data.tagValue = body.tagValue;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const updated = await db.affiliateLink.update({ where: { id }, data });
    return NextResponse.json({ affiliate: mapAffiliate(updated) });
  } catch (err) {
    console.error("PUT /api/admin/affiliates/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to update affiliate" },
      { status: 500 }
    );
  }
}
