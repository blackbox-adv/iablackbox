// POST /api/search-log — record a search query (best-effort, never blocks).
// Normalizes the query (lowercase + trim), then upserts the SearchLog row:
// if the query already exists, increment count + update lastSearched + hasResults;
// otherwise create a new row. Always returns 200.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface SearchLogBody {
  query?: string;
  hasResults?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as SearchLogBody | null;
    const raw = (body?.query ?? "").toString().trim().toLowerCase();
    if (!raw) {
      // Nothing to log — still 200 so the caller's search is never blocked.
      return NextResponse.json({ success: true });
    }
    const hasResults = Boolean(body?.hasResults);

    const existing = await db.searchLog.findUnique({
      where: { query: raw },
      select: { id: true, count: true },
    });

    if (existing) {
      await db.searchLog.update({
        where: { id: existing.id },
        data: {
          count: existing.count + 1,
          hasResults,
          lastSearched: new Date(),
        },
      });
    } else {
      await db.searchLog.create({
        data: {
          query: raw,
          count: 1,
          hasResults,
          lastSearched: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    // Best-effort: log + return success so search UX is never broken.
    console.error("POST /api/search-log failed:", err);
    return NextResponse.json({ success: true });
  }
}
