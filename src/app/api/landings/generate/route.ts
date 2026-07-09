// POST /api/landings/generate — AI-generate a complete SEO landing page from a
// trending search query. The landing is saved in "draft" status for admin review.
//
// Flow:
//   1. Read ai_tone.
//   2. Fetch up to 6 related active products (accent-insensitive search on
//      name/description/category/features — same approach as fetchProducts).
//      Include their offers + latest aiScore for context.
//   3. Call chatComplete() with a strict no-invention system prompt.
//   4. Parse the JSON response ({ slug, title, metaTitle, metaDescription, h1,
//      intro, body[{type,heading,content}], faqs[{q,a}] }).
//   5. Ensure the slug is unique within LandingPage.
//   6. Create the LandingPage row with status="draft", relatedQuery=query,
//      productIds = JSON of related product IDs.
//   7. Return { landing } with 201.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAiTone } from "@/lib/api-helpers";
import { chatComplete } from "@/lib/ai-client";
import type { Product, Offer, AiScore, Faq } from "@/lib/types";

interface GenerateBody {
  query: string;
}

interface LandingSection {
  type: string;
  heading: string;
  content: string;
}

interface LandingAiResponse {
  slug?: string;
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  h1?: string;
  intro?: string;
  body?: LandingSection[];
  faqs?: Faq[];
}

/**
 * Normalize text for accent-insensitive, case-insensitive search.
 * (Same logic as the helper in api-helpers.ts — kept local to avoid exporting
 * a private helper from that module.)
 */
function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Fetch up to `take` active products that match `query` (accent-insensitive)
 * across name/description/brand/category/features. Includes offers + latest
 * aiScore, parsed via the same convention as parseProduct.
 */
async function fetchRelatedProducts(
  query: string,
  take: number
): Promise<Product[]> {
  const norm = normalizeText(query.trim());
  if (!norm) return [];
  const rows = await db.product.findMany({
    where: { isActive: true },
    include: {
      offers: { orderBy: { price: "asc" } },
      aiScores: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const filtered = rows.filter((p) =>
    normalizeText(
      [p.name, p.description, p.brand ?? "", p.category, p.features].join(" ")
    ).includes(norm)
  );
  return filtered.slice(0, take).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    brand: p.brand ?? null,
    images: safeJsonArray(p.images),
    features: safeJsonArray(p.features),
    specs: safeJsonRecord(p.specs),
    isActive: p.isActive,
    isViral: p.isViral,
    sourceUrl: p.sourceUrl ?? null,
    sourceStore: p.sourceStore ?? null,
    slug: p.slug ?? null,
    isFeatured: p.isFeatured ?? false,
    lastFetchedAt:
      p.lastFetchedAt instanceof Date
        ? p.lastFetchedAt.toISOString()
        : p.lastFetchedAt != null
          ? String(p.lastFetchedAt)
          : null,
    metaTitle: p.metaTitle ?? null,
    metaDescription: p.metaDescription ?? null,
    advantages: safeJsonArray(p.advantages),
    disadvantages: safeJsonArray(p.disadvantages),
    useCases: safeJsonArray(p.useCases),
    faqs: safeJsonFaqs(p.faqs),
    createdAt:
      p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    updatedAt:
      p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    offers: (p.offers ?? []).map((o) => mapOffer(o)),
    aiScore: p.aiScores && p.aiScores.length > 0 ? mapAiScore(p.aiScores[0]) : null,
  }));
}

function safeJsonArray(s: string | string[]): string[] {
  if (Array.isArray(s)) return s;
  try {
    const v = JSON.parse(s ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function safeJsonRecord(s: string | Record<string, unknown>): Record<string, string> {
  if (typeof s === "object" && s !== null && !Array.isArray(s)) {
    return s as Record<string, string>;
  }
  try {
    const v = JSON.parse((s as string) ?? "{}");
    return typeof v === "object" && v !== null ? v : {};
  } catch {
    return {};
  }
}

function safeJsonFaqs(s: string | Faq[]): Faq[] {
  if (Array.isArray(s)) return s;
  try {
    const v = JSON.parse(s ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function mapOffer(o: any): Offer {
  return {
    id: o.id,
    productId: o.productId,
    store: o.store,
    price: o.price,
    originalPrice: o.originalPrice ?? null,
    affiliateLink: o.affiliateLink,
    shippingTime: o.shippingTime,
    shippingCost: o.shippingCost,
    availability: o.availability,
    rating: o.rating ?? null,
    reviewCount: o.reviewCount,
    updatedAt:
      o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt),
  };
}

function mapAiScore(s: any): AiScore {
  return {
    id: s.id,
    productId: s.productId,
    score: s.score,
    classification: s.classification,
    reasoning: s.reasoning,
    recommendation: s.recommendation ?? null,
    bestStore: s.bestStore ?? null,
    summary: s.summary ?? null,
    updatedAt:
      s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
  };
}

/** Ensure the slug is unique within LandingPage. Appends -2, -3, ... as needed. */
async function ensureUniqueLandingSlug(slug: string): Promise<string> {
  const base = slug || "guia";
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const existing = await db.landingPage.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 1000) return `${base}-${Date.now()}`;
  }
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "guia"
  );
}

/** Build a real-data context string for the AI so it can reference actual
 *  products without inventing them. */
function buildProductContext(products: Product[]): string {
  if (products.length === 0) {
    return "PRODUCTOS RELACIONADOS: No hay productos en el catálogo que coincidan con esta búsqueda.";
  }
  const lines: string[] = ["PRODUCTOS RELACIONADOS (datos reales):"];
  for (const p of products) {
    const offers = p.offers ?? [];
    const best = offers[0];
    const score = p.aiScore?.score;
    lines.push(
      `- ${p.name}${p.brand ? ` (${p.brand})` : ""} — categoría: ${p.category}` +
        (best ? ` — mejor precio: S/${best.price.toFixed(2)} en ${best.store}` : "") +
        (score != null ? ` — puntuación IA: ${score}/100` : "") +
        (p.features && p.features.length
          ? ` — características: ${p.features.slice(0, 4).join("; ")}`
          : "")
    );
  }
  return lines.join("\n");
}

function extractJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
  }
  return {};
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as GenerateBody | null;
    const query = (body?.query ?? "").toString().trim();
    if (!query) {
      return NextResponse.json(
        { error: "Falta el parámetro 'query'." },
        { status: 400 }
      );
    }

    const tone = await getAiTone();

    // ---- Fetch related products (accent-insensitive) ----
    const related = await fetchRelatedProducts(query, 6);
    const productIds = related.map((p) => p.id);
    const productContext = buildProductContext(related);

    // ---- AI prompt (strict no-invention) ----
    const systemPrompt = `Generas contenido SEO útil basado en datos reales. NUNCA inventes productos ni precios. Si no hay productos relacionados, genera contenido genérico útil sobre el tema.

Reglas:
- Escribe en español natural, útil y orientado al usuario. NO atiborres el texto con palabras clave.
- Si mencionas un producto, debe ser uno de los productos reales listados en el contexto. NUNCA inventes un producto, marca, precio o tienda que no esté en el contexto.
- Si no hay productos relacionados, NO menciones productos específicos. Habla del tema de forma general y útil.
- El slug debe ser amigable (minúsculas, guiones, sin acentos).
- Respondes SIEMPRE con JSON válido, sin texto adicional ni markdown.`;

    const userPrompt = `Consulta de búsqueda (lo que la gente busca): "${query}"

${productContext}

Genera una página de aterrizaje SEO completa en español. Responde con este JSON exacto:
{
  "slug": "slug-amigable-de-la-guia-en-minusculas-con-guiones",
  "title": "Título de la guía (50-70 caracteres)",
  "metaTitle": "Meta título SEO (50-60 caracteres)",
  "metaDescription": "Meta descripción SEO (140-160 caracteres)",
  "h1": "Encabezado H1 de la página (puede ser más largo que el metaTitle)",
  "intro": "1-2 párrafos de introducción útil y natural, sin atiborrar de palabras clave.",
  "body": [
    {"type": "section", "heading": "Qué es", "content": "1-2 párrafos explicando qué es el producto o tema."},
    {"type": "section", "heading": "Cómo elegir", "content": "1-2 párrafos con criterios de elección (precio, calidad, características clave)."},
    {"type": "section", "heading": "Mejores opciones", "content": "Si hay productos reales, menciónalos con su nombre y tienda. Si no, explica cómo encontrar buenas opciones."},
    {"type": "section", "heading": "Consejos", "content": "1 párrafo con consejos prácticos para comprar inteligentemente."}
  ],
  "faqs": [
    {"q": "pregunta frecuente 1", "a": "respuesta útil y concreta"},
    {"q": "pregunta frecuente 2", "a": "respuesta útil y concreta"},
    {"q": "pregunta frecuente 3", "a": "respuesta útil y concreta"},
    {"q": "pregunta frecuente 4", "a": "respuesta útil y concreta"}
  ]
}

RECUERDA: NUNCA inventes productos ni precios. Si no hay productos en el contexto, escribe contenido genérico útil sobre el tema sin mencionar productos específicos. Tono: ${tone}.`;

    const raw = await chatComplete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      undefined
    );

    const json = extractJson(raw) as LandingAiResponse;

    // ---- Validate / fallback the required fields ----
    const slugRaw = slugify(json.slug || query);
    const slug = await ensureUniqueLandingSlug(slugRaw);
    const title = (json.title ?? `Guía: ${query}`).slice(0, 200);
    const h1 = (json.h1 ?? title).slice(0, 200);
    const metaTitle = (json.metaTitle ?? title).slice(0, 70) || null;
    const metaDescription = (json.metaDescription ?? "").slice(0, 165) || null;
    const intro = (json.intro ?? "").slice(0, 4000);
    const bodySections: LandingSection[] = Array.isArray(json.body)
      ? json.body
          .filter(
            (s) =>
              s &&
              typeof s === "object" &&
              typeof s.heading === "string" &&
              typeof s.content === "string"
          )
          .slice(0, 6)
          .map((s) => ({
            type: typeof s.type === "string" ? s.type : "section",
            heading: s.heading,
            content: s.content,
          }))
      : [];
    const faqs: Faq[] = Array.isArray(json.faqs)
      ? json.faqs
          .filter(
            (f) =>
              f &&
              typeof f === "object" &&
              typeof f.q === "string" &&
              typeof f.a === "string"
          )
          .slice(0, 8)
          .map((f) => ({ q: f.q, a: f.a }))
      : [];

    // ---- Create LandingPage (draft status) ----
    const landing = await db.landingPage.create({
      data: {
        slug,
        title,
        metaTitle,
        metaDescription,
        h1,
        intro,
        body: JSON.stringify(bodySections),
        faqs: JSON.stringify(faqs),
        relatedQuery: query,
        status: "draft",
        productIds: JSON.stringify(productIds),
      },
    });

    return NextResponse.json(
      {
        landing: {
          id: landing.id,
          slug: landing.slug,
          title: landing.title,
          metaTitle: landing.metaTitle,
          metaDescription: landing.metaDescription,
          h1: landing.h1,
          intro: landing.intro,
          body: bodySections,
          faqs,
          relatedQuery: landing.relatedQuery,
          status: landing.status,
          category: landing.category,
          productIds,
          createdAt:
            landing.createdAt instanceof Date
              ? landing.createdAt.toISOString()
              : String(landing.createdAt),
          updatedAt:
            landing.updatedAt instanceof Date
              ? landing.updatedAt.toISOString()
              : String(landing.updatedAt),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/landings/generate failed:", err);
    return NextResponse.json(
      { error: "No se pudo generar la landing." },
      { status: 500 }
    );
  }
}
