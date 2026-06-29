// POST /api/products/bulk-refresh — refresh multiple products sequentially.
// Body: { ids: string[] }. Returns per-id results so one failure doesn't
// block the others.
import { NextRequest, NextResponse } from "next/server";
import { refreshProduct } from "@/lib/api-helpers";

interface BulkRefreshBody {
  ids: string[];
}

interface BulkRefreshResult {
  id: string;
  success: boolean;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as BulkRefreshBody | null;
    const ids = Array.isArray(body?.ids) ? (body!.ids as string[]) : [];
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty 'ids' array" },
        { status: 400 }
      );
    }

    const results: BulkRefreshResult[] = [];

    // Process sequentially to respect scraper/AI rate limits.
    for (const id of ids) {
      try {
        await refreshProduct(id);
        results.push({ id, success: true });
      } catch (err) {
        console.error(`bulk-refresh: failed for ${id}:`, err);
        const msg =
          err instanceof Error ? err.message : "Failed to refresh product";
        results.push({ id, success: false, error: msg });
      }
      // Small delay between refreshes to be polite to upstream stores.
      await new Promise((r) => setTimeout(r, 250));
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("POST /api/products/bulk-refresh failed:", err);
    return NextResponse.json(
      { error: "Failed to bulk refresh products" },
      { status: 500 }
    );
  }
}
