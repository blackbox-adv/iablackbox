// GET /api/admin/ai-settings — read all AI settings as key→value map
// PUT /api/admin/ai-settings — upsert settings
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  try {
    const rows = await db.aiSetting.findMany();
    const settings: Record<string, string> = {};
    for (const r of rows) {
      // SECURITY: never expose the API key to the client. Return a masked
      // indicator (true/false) so the admin UI knows if a key is set.
      if (r.key === "ai_api_key") {
        settings[r.key] = r.value ? "••••••••" : "";
        settings["ai_api_key_set"] = r.value ? "true" : "false";
      } else {
        settings[r.key] = r.value;
      }
    }
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

    // SECURITY: skip masked API key — don't overwrite the real key with "••••••••"
    // Only update ai_api_key if it's a real value (not the mask placeholder).
    const entries = Object.entries(body.settings).filter(([key, value]) => {
      if (key === "ai_api_key" && value === "••••••••") return false;
      return true;
    });
    await db.$transaction(
      entries.map(([key, value]) =>
        db.aiSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    // Return masked (same as GET — never expose real key)
    const rows = await db.aiSetting.findMany();
    const settings: Record<string, string> = {};
    for (const r of rows) {
      if (r.key === "ai_api_key") {
        settings[r.key] = r.value ? "••••••••" : "";
        settings["ai_api_key_set"] = r.value ? "true" : "false";
      } else {
        settings[r.key] = r.value;
      }
    }

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("PUT /api/admin/ai-settings failed:", err);
    return NextResponse.json(
      { error: "Failed to update AI settings" },
      { status: 500 }
    );
  }
}
