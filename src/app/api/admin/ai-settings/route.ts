// GET /api/admin/ai-settings — read all AI settings as key→value map
// PUT /api/admin/ai-settings — upsert settings
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  try {
    const rows = await db.aiSetting.findMany();
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("GET /api/admin/ai-settings failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch AI settings" },
      { status: 500 }
    );
  }
}

interface PutBody {
  settings: Record<string, string>;
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as PutBody;
    if (!body?.settings || typeof body.settings !== "object") {
      return NextResponse.json(
        { error: "Expected { settings: {...} }" },
        { status: 400 }
      );
    }

    const entries = Object.entries(body.settings);
    await db.$transaction(
      entries.map(([key, value]) =>
        db.aiSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    const rows = await db.aiSetting.findMany();
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("PUT /api/admin/ai-settings failed:", err);
    return NextResponse.json(
      { error: "Failed to update AI settings" },
      { status: 500 }
    );
  }
}
