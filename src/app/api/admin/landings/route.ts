// GET /api/admin/landings — list all landing pages ordered by updatedAt DESC.
// Returns JSON-parsed body / faqs / productIds so the admin UI can render
// the content without re-parsing.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export interface LandingPageDTO {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string;
  intro: string;
  body: Array<{ type: string; heading: string; content: string }>;
  faqs: Array<{ q: string; a: string }>;
  relatedQuery: string | null;
  status: string;
  category: string | null;
  productIds: string[];
  createdAt: string;
  updatedAt: string;
}

function parseLanding(r: any): LandingPageDTO {
  let body: Array<{ type: string; heading: string; content: string }> = [];
  let faqs: Array<{ q: string; a: string }> = [];
  let productIds: string[] = [];
  try {
    body = JSON.parse(r.body ?? "[]");
  } catch {
    body = [];
  }
  try {
    faqs = JSON.parse(r.faqs ?? "[]");
  } catch {
    faqs = [];
  }
  try {
    productIds = JSON.parse(r.productIds ?? "[]");
  } catch {
    productIds = [];
  }
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    metaTitle: r.metaTitle ?? null,
    metaDescription: r.metaDescription ?? null,
    h1: r.h1,
    intro: r.intro,
    body,
    faqs,
    relatedQuery: r.relatedQuery ?? null,
    status: r.status,
    category: r.category ?? null,
    productIds,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt:
      r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

export async function GET(_req: NextRequest) {
  try {
    const rows = await db.landingPage.findMany({
      orderBy: { updatedAt: "desc" },
    });
    const landings = rows.map(parseLanding);
    return NextResponse.json({ landings });
  } catch (err) {
    console.error("GET /api/admin/landings failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch landing pages" },
      { status: 500 }
    );
  }
}
