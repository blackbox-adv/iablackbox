// GET /api/admin/sections — all home sections ordered
// PUT /api/admin/sections — bulk update order + isActive
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { HomeSection } from "@/lib/types";

function mapSection(s: any): HomeSection {
  let config: Record<string, unknown> = {};
  try {
    config = typeof s.config === "object" ? s.config : JSON.parse(s.config ?? "{}");
  } catch {
    config = {};
  }
  return {
    id: s.id,
    type: s.type,
    title: s.title,
    subtitle: s.subtitle ?? null,
    isActive: s.isActive,
    order: s.order,
    config,
  };
}

export async function GET(_req: NextRequest) {
  try {
    const rows = await db.homeSection.findMany({ orderBy: { order: "asc" } });
    const sections = rows.map(mapSection);
    return NextResponse.json({ sections });
  } catch (err) {
    console.error("GET /api/admin/sections failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch sections" },
      { status: 500 }
    );
  }
}

interface SectionUpdate {
  id: string;
  order: number;
  isActive: boolean;
}

interface PutBody {
  sections: SectionUpdate[];
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as PutBody;
    if (!Array.isArray(body?.sections)) {
      return NextResponse.json(
        { error: "Expected { sections: [...] }" },
        { status: 400 }
      );
    }

    // Update each section's order + isActive (title/subtitle/config untouched).
    await db.$transaction(
      body.sections.map((s) =>
        db.homeSection.update({
          where: { id: s.id },
          data: { order: s.order, isActive: s.isActive },
        })
      )
    );

    const rows = await db.homeSection.findMany({ orderBy: { order: "asc" } });
    const sections = rows.map(mapSection);
    return NextResponse.json({ sections });
  } catch (err) {
    console.error("PUT /api/admin/sections failed:", err);
    return NextResponse.json(
      { error: "Failed to update sections" },
      { status: 500 }
    );
  }
}
