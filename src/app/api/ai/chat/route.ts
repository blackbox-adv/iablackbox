// POST /api/ai/chat — conversational AI Q&A about a product.
// The customer asks questions like "¿Vale la pena comprarlo?" or "¿Cuándo
// baja de precio?" and the AI answers using ONLY real product data.
//
// This is the "wow" differentiator — turns BLACKBOX from a comparator into an
// intelligent shopping advisor (like Perplexity for products).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseProduct } from "@/lib/api-helpers";
import { chatComplete } from "@/lib/ai-client";
import { formatPEN, STORES } from "@/lib/constants";

interface ChatBody {
  productId: string;
  question: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

// Simple in-memory rate limit: 20 chat requests per IP per 5 minutes.
// Prevents abuse of the (costly) AI endpoint.
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 min
const RATE_LIMIT_MAX = 20;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (hit.count >= RATE_LIMIT_MAX) return false;
  hit.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Demasiadas preguntas. Intenta de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const body = (await req.json().catch(() => null)) as ChatBody | null;
    if (!body?.productId || !body?.question?.trim()) {
      return NextResponse.json(
        { error: "Se requiere productId y question" },
        { status: 400 }
      );
    }

    // Limit question length to prevent abuse
    const question = body.question.trim().slice(0, 500);
    if (question.length < 2) {
      return NextResponse.json({ error: "Pregunta muy corta" }, { status: 400 });
    }

    // Fetch product with offers + latest AI score
    const product = await db.product.findUnique({
      where: { id: body.productId },
      include: {
        offers: { orderBy: { price: "asc" } },
        aiScores: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    const p = parseProduct(product);

    // Build real-data context (NEVER invent)
    const offers = p.offers ?? [];
    const best = offers[0];
    const aiScore = p.aiScore;
    const context = [
      `PRODUCTO: ${p.name}`,
      p.brand ? `MARCA: ${p.brand}` : "MARCA: No disponible",
      `CATEGORÍA: ${p.category}`,
      p.description ? `DESCRIPCIÓN: ${p.description}` : "DESCRIPCIÓN: No disponible",
      p.features?.length ? `CARACTERÍSTICAS: ${p.features.join("; ")}` : "CARACTERÍSTICAS: No disponible",
      offers.length
        ? `OFERTAS:\n${offers
            .map(
              (o) =>
                `  - ${STORES[o.store as keyof typeof STORES]?.label ?? o.store}: ${formatPEN(o.price)}${
                  o.originalPrice ? ` (antes ${formatPEN(o.originalPrice)})` : ""
                }, envío ${o.shippingTime}, rating ${o.rating ?? "N/A"}, ${o.reviewCount} reseñas, ${o.availability}`
            )
            .join("\n")}`
        : "OFERTAS: No disponibles",
      aiScore
        ? `ANÁLISIS IA: score ${aiScore.score}/100 (${aiScore.classification}). ${aiScore.reasoning || ""} Recomendación: ${aiScore.recommendation || "No disponible"}`
        : "ANÁLISIS IA: No disponible",
      p.advantages?.length ? `VENTAJAS: ${p.advantages.join("; ")}` : "",
      p.disadvantages?.length ? `DESVENTAJAS: ${p.disadvantages.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `Eres BLACKBOX IA, un asesor de compras experto integrado en una plataforma de comparación de productos. El usuario te hace preguntas sobre un producto específico.

CONTEXTO DEL PRODUCTO (datos reales):
${context}

REGLAS:
- Responde ÚNICAMENTE basándote en los datos reales del contexto.
- NUNCA inventes precios, especificaciones, ratings ni ninguna información que no esté en el contexto.
- Si no tienes datos suficientes para responder, dilo claramente ("No tengo esa información disponible").
- Sé directo, claro y útil. Frases cortas. Sin tecnicismos innecesarios.
- Si el usuario pregunta si vale la pena comprar, da una opinión clara basada en el score IA, precio, rating y ofertas.
- Si pregunta por precios, menciona las tiendas y sus precios reales del contexto.
- Si pregunta por alternativas, sugiere buscar en la categoría del producto (no inventes productos específicos).
- Responde en español, en máximo 3-4 frases (salvo que necesites más para ser útil).
- NO uses markdown ni símbolos especiales. Texto plano natural.`;

    // Build messages: system + optional history + current question
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];
    if (body.history && Array.isArray(body.history)) {
      for (const h of body.history.slice(-4)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: "user", content: question });

    const answer = await chatComplete(messages);

    return NextResponse.json({ answer, productId: body.productId });
  } catch (err) {
    console.error("POST /api/ai/chat failed:", err);
    return NextResponse.json(
      { error: "No se pudo generar la respuesta. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
