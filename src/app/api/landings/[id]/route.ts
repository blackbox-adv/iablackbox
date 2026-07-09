// GET /api/landings/[id] — public published landing page.
//   The `[id]` segment is the slug in public usage (SEO-friendly URLs), but
//   also accepts an internal id for convenience. Looks up by slug first, then
//   by id. Returns 404 if the landing doesn't exist OR isn't published.
//   Includes parsed JSON fields (body, faqs, productIds) and the related
//   products (from productIds, active only) with offers + latest aiScore.
//
// PUT /api/landings/[id] — admin update a landing page (partial).
//   Accepts: title, metaTitle, metaDescription, h1, intro, body, faqs, status,
//   category, productIds. Arrays/objects are JSON.stringified before persist.
//
// DELETE /api/landings/[id] — admin delete a landing page.
//
// NOTE: Next.js requires the same parameter name for sibling dynamic routes,
// so the public GET (which semantically takes a slug) lives in the same
// `[id]` route as the admin PUT/DELETE. The GET handler treats the param as
// "slug-or-id" and falls back from slug → id.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseProduct } from "@/lib/api-helpers";
import type { Faq } from "@/lib/types";

interface LandingSection {
  type: string;
  heading: string;
  content: string;
}

function parseLanding(r: any) {
  let body: LandingSection[] = [];
  let faqs: Faq[] = [];
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Look up by slug first (public SEO usage), then fall back to id.
    const row =
      (await db.landingPage.findUnique({ where: { slug: id } })) ??
      (await db.landingPage.findUnique({ where: { id } }));

    if (!row || row.status !== "published") {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    const landing = parseLanding(row);

    // Fetch the related products (active only — keep public content honest).
    let products: ReturnType<typeof parseProduct>[] = [];
    if (landing.productIds.length > 0) {
      const rows = await db.product.findMany({
        where: { id: { in: landing.productIds }, isActive: true },
        include: {
          offers: { orderBy: { price: "asc" } },
          aiScores: { orderBy: { updatedAt: "desc" }, take: 1 },
        },
      });
      // Preserve the original productIds order (the AI's relevance order).
      const byId = new Map(rows.map((r) => [r.id, r]));
      products = landing.productIds
        .map((pid) => byId.get(pid))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map(parseProduct);
    }

    return NextResponse.json({ landing, products });
  } catch (err) {
    console.error("GET /api/landings/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch landing page" },
      { status: 500 }
    );
  }
}

interface UpdateBody {
  title?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  h1?: string;
  intro?: string;
  body?: LandingSection[];
  faqs?: Faq[];
  status?: string;
  category?: string | null;
  productIds?: string[];
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as UpdateBody | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const existing = await db.landingPage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (typeof body.title === "string") data.title = body.title;
    if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle ?? null;
    if (body.metaDescription !== undefined)
      data.metaDescription = body.metaDescription ?? null;
    if (typeof body.h1 === "string") data.h1 = body.h1;
    if (typeof body.intro === "string") data.intro = body.intro;
    if (Array.isArray(body.body)) data.body = JSON.stringify(body.body);
    if (Array.isArray(body.faqs)) data.faqs = JSON.stringify(body.faqs);
    if (typeof body.status === "string") data.status = body.status;
    if (body.category !== undefined) data.category = body.category ?? null;
    if (Array.isArray(body.productIds))
      data.productIds = JSON.stringify(body.productIds);

    const updated = await db.landingPage.update({ where: { id }, data });
    return NextResponse.json({ landing: parseLanding(updated) });
  } catch (err) {
    console.error("PUT /api/landings/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to update landing page" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.landingPage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }
    await db.landingPage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/landings/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to delete landing page" },
      { status: 500 }
    );
  }
}
