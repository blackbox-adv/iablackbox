// GET /api/admin/affiliates — list affiliate configs
// POST /api/admin/affiliates — create affiliate config
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AffiliateLink } from "@/lib/types";

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

export async function GET(_req: NextRequest) {
  try {
    const rows = await db.affiliateLink.findMany({
      orderBy: { store: "asc" },
    });
    const affiliates = rows.map(mapAffiliate);
    return NextResponse.json({ affiliates });
  } catch (err) {
    console.error("GET /api/admin/affiliates failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch affiliates" },
      { status: 500 }
    );
  }
}

interface CreateBody {
  store: string;
  baseUrl: string;
  tagParam?: string | null;
  tagValue?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateBody;
    if (!body?.store || !body?.baseUrl) {
      return NextResponse.json(
        { error: "Missing required fields: store, baseUrl" },
        { status: 400 }
      );
    }

    const created = await db.affiliateLink.create({
      data: {
        store: body.store,
        baseUrl: body.baseUrl,
        tagParam: body.tagParam ?? null,
        tagValue: body.tagValue ?? null,
        isActive: true,
      },
    });

    return NextResponse.json(
      { affiliate: mapAffiliate(created) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/admin/affiliates failed:", err);
    return NextResponse.json(
      { error: "Failed to create affiliate" },
      { status: 500 }
    );
  }
}
