// GET /api/admin/trends — top searched queries (for the admin trends panel).
// Returns up to 20 SearchLog rows ordered by count DESC. Optional
// ?onlyEmpty=1 filters to only searches with no matching products
// (these are candidates for landing-page generation or new product imports).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface TrendRow {
  query: string;
  count: number;
  hasResults: boolean;
  lastSearched: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyEmpty = searchParams.get("onlyEmpty") === "1";

    const where = onlyEmpty ? { hasResults: false } : undefined;

    const rows = await db.searchLog.findMany({
      where,
      orderBy: { count: "desc" },
      take: 20,
    });

    const trends: TrendRow[] = rows.map((r) => ({
      query: r.query,
      count: r.count,
      hasResults: r.hasResults,
      lastSearched:
        r.lastSearched instanceof Date
          ? r.lastSearched.toISOString()
          : String(r.lastSearched),
    }));

    return NextResponse.json({ trends });
  } catch (err) {
    console.error("GET /api/admin/trends failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch search trends" },
      { status: 500 }
    );
  }
}
