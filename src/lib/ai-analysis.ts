// BLACKBOX V2 AI analysis module — generates the FULL analysis from REAL data only.
// CRITICAL RULE: the AI must NEVER invent product data. If a datum is missing
// from the input, the AI must write "No disponible" (or omit the field), never
// fabricate a price, rating, spec, or feature.

import { chatComplete, getAiConfig } from "./ai-client";
import type { AiTone, Offer } from "./types";
import { classificationFromScore } from "./constants";
import type { ScrapedProduct } from "./scraper/types";

const TONE_PROMPTS: Record<AiTone, string> = {
  simple:
    "Eres un asesor de compras experto. Hablas claro y directo, sin tecnicismos. Frases cortas y recomendaciones accionables.",
  tecnico:
    "Eres un asesor de compras técnico. Incluye especificaciones relevantes y datos concretos para justificar la recomendación.",
  vendedor:
    "Eres un asesor de compras persuasivo. Enfoca en beneficios y ventajas con un tono cercano que invita a decidir.",
  neutral:
    "Eres un asesor de compras objetivo. Presentas solo hechos verificables y dejas la decisión al usuario.",
};

export interface ProductAnalysisInput {
  name: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  features: string[];
  specs: Record<string, string>;
  offers: Offer[];
  scraped: {
    price: number | null;
    originalPrice: number | null;
    rating: number | null;
    reviewCount: number | null;
    availability: string;
    shippingTime: string | null;
    store: string;
  };
}

export interface ProductAnalysis {
  summary: string;
  advantages: string[];
  disadvantages: string[];
  useCases: string[];
  score: number; // 0-100
  classification: string;
  reasoning: string;
  recommendation: string;
  bestStore: string | null;
  faqs: { q: string; a: string }[];
  metaTitle: string;
  metaDescription: string;
  slug: string;
}

const ND = "No disponible";

/**
 * Build a strictly-factual context string for the LLM from REAL scraped data.
 * Missing data is shown as "No disponible" — the AI is told this explicitly.
 */
function buildContext(input: ProductAnalysisInput): string {
  const s = input.scraped;
  const lines: string[] = [];
  lines.push(`NOMBRE: ${input.name ?? ND}`);
  lines.push(`MARCA: ${input.brand ?? ND}`);
  lines.push(`CATEGORÍA: ${input.category ?? ND}`);
  lines.push(`DESCRIPCIÓN: ${input.description ?? ND}`);
  lines.push(`CARACTERÍSTICAS: ${input.features.length ? input.features.join("; ") : ND}`);
  lines.push(`ESPECIFICACIONES: ${Object.keys(input.specs).length ? Object.entries(input.specs).map(([k, v]) => `${k}: ${v}`).join("; ") : ND}`);

  if (input.offers.length > 0) {
    lines.push("OFERTAS EN TIENDAS:");
    for (const o of input.offers) {
      lines.push(
        `  - ${o.store}: ${o.price != null ? `S/${o.price.toFixed(2)}` : ND}${
          o.originalPrice ? ` (antes S/${o.originalPrice.toFixed(2)})` : ""
        }, envío: ${o.shippingTime ?? ND}, disponibilidad: ${o.availability}, rating: ${
          o.rating ?? ND
        }, reseñas: ${o.reviewCount || ND}`
      );
    }
  } else {
    lines.push(`OFERTAS: ${ND} (solo hay datos de la tienda origen)`);
    lines.push(`  - ${s.store}: precio ${s.price != null ? `S/${s.price.toFixed(2)}` : ND}, envío: ${s.shippingTime ?? ND}, rating: ${s.rating ?? ND}, reseñas: ${s.reviewCount ?? ND}, disponibilidad: ${s.availability}`);
  }

  return lines.join("\n");
}

/**
 * Generate the full V2 product analysis from real data.
 * Enforces the no-invention rule via the system prompt.
 */
export async function analyzeProduct(
  input: ProductAnalysisInput,
  tone: AiTone = "simple"
): Promise<ProductAnalysis> {
  const config = await getAiConfig();
  const context = buildContext(input);

  const systemPrompt = `${TONE_PROMPTS[tone]}

REGLA CRÍTICA — INTEGRIDAD DE DATOS:
- Analizas ÚNICAMENTE los datos reales proporcionados en el contexto.
- NUNCA inventes ni asumas precios, descuentos, ratings, reseñas, especificaciones, tiempos de envío, stock, ni ninguna otra información del producto.
- Si un dato aparece como "No disponible" o no está en el contexto, NO lo menciones como si existiera. Si necesitas referirte a él, di "No disponible".
- Las ventajas y desventajas deben basarse en los datos reales (precio, marca, características, envío, rating). Si no hay datos suficientes para una ventaja o desventaja, no la inventes — devuelve un array más corto.
- El score (0-100) debe basarse SOLO en los datos reales disponibles (precio, descuento, rating, reseñas, envío). Si hay pocos datos, el score debe ser conservador (no inflarlo).
- Respondes SIEMPRE con JSON válido, sin texto adicional, sin markdown.`;

  const userPrompt = `Datos reales del producto:
${context}

Genera el análisis completo. Responde con este JSON exacto:
{
  "summary": "Resumen simple del producto en 1-2 frases, basado solo en los datos reales.",
  "advantages": ["ventaja real 1", "ventaja real 2"],
  "disadvantages": ["desventaja real 1"],
  "useCases": ["caso de uso 1", "caso de uso 2"],
  "score": <0-100, basado en datos reales>,
  "reasoning": "Explicación del score basada en los datos reales disponibles.",
  "recommendation": "Recomendación clara de compra, o 'No hay suficientes datos para recomendar' si faltan datos clave.",
  "bestStore": "tienda recomendada o null",
  "faqs": [
    {"q": "pregunta frecuente", "a": "respuesta basada en datos reales o 'No disponible'"}
  ],
  "metaTitle": "Título SEO de 50-60 caracteres",
  "metaDescription": "Meta descripción SEO de 140-160 caracteres",
  "slug": "slug-amigable-en-minusculas-con-guiones"
}

Recuerda: NUNCA inventes datos. Si no hay info, usa "No disponible".`;

  try {
    const raw = await chatComplete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      config
    );
    const json = extractJson(raw);
    const score = clampScore(Number(json.score) || fallbackScore(input));
    return {
      summary: str(json.summary, input),
      advantages: strArray(json.advantages),
      disadvantages: strArray(json.disadvantages),
      useCases: strArray(json.useCases),
      score,
      classification: classificationFromScore(score),
      reasoning: str(json.reasoning, input),
      recommendation: str(json.recommendation, input),
      bestStore: json.bestStore ? String(json.bestStore) : null,
      faqs: faqArray(json.faqs),
      metaTitle: str(json.metaTitle, input).slice(0, 70),
      metaDescription: str(json.metaDescription, input).slice(0, 165),
      slug: slugify(json.slug ? String(json.slug) : input.name ?? "producto"),
    };
  } catch (err) {
    console.error("AI analysis failed:", err);
    return fallbackAnalysis(input);
  }
}

/**
 * Map a ScrapedProduct (real data) into an Offer + analysis input.
 * Used when importing a product from a single URL (one store).
 */
export function scrapedToAnalysisInput(
  scraped: ScrapedProduct,
  existingOffers: Offer[] = []
): { offers: Offer[]; analysisInput: ProductAnalysisInput } {
  const offers: Offer[] = existingOffers.length ? existingOffers : [];
  if (scraped.price != null) {
    offers.push({
      id: "scraped-temp",
      productId: "scraped-temp",
      store: scraped.sourceStore,
      price: scraped.price,
      originalPrice: scraped.originalPrice,
      affiliateLink: scraped.sourceUrl,
      shippingTime: scraped.shippingTime ?? "No disponible",
      shippingCost: scraped.shippingCost ?? 0,
      availability: scraped.availability,
      rating: scraped.rating,
      reviewCount: scraped.reviewCount ?? 0,
      currency: "PEN",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    } as Offer);
  }
  return {
    offers: existingOffers,
    analysisInput: {
      name: scraped.name,
      description: scraped.description,
      brand: scraped.brand,
      category: scraped.category,
      features: scraped.features,
      specs: scraped.specs,
      offers,
      scraped: {
        price: scraped.price,
        originalPrice: scraped.originalPrice,
        rating: scraped.rating,
        reviewCount: scraped.reviewCount,
        availability: scraped.availability,
        shippingTime: scraped.shippingTime,
        store: scraped.sourceStore,
      },
    },
  };
}

// ---------- helpers ----------

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

function str(v: unknown, input: ProductAnalysisInput): string {
  if (typeof v === "string" && v.trim()) return v.trim();
  // Fallbacks derived ONLY from real data
  if (input.name) return input.name;
  return ND;
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter((x) => x.length > 0).slice(0, 6);
}

function faqArray(v: unknown): { q: string; a: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x !== "object" || x === null) return null;
      const o = x as Record<string, unknown>;
      const q = typeof o.q === "string" ? o.q.trim() : typeof o.question === "string" ? o.question.trim() : "";
      const a = typeof o.a === "string" ? o.a.trim() : typeof o.answer === "string" ? o.answer.trim() : "";
      return q && a ? { q, a } : null;
    })
    .filter((x): x is { q: string; a: string } => x !== null)
    .slice(0, 5);
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "producto";
}

function fallbackScore(input: ProductAnalysisInput): number {
  // Conservative score from real data only
  let score = 50;
  if (input.scraped.price != null) score += 5;
  if (input.scraped.originalPrice && input.scraped.price && input.scraped.originalPrice > input.scraped.price) {
    const disc = (input.scraped.originalPrice - input.scraped.price) / input.scraped.originalPrice;
    score += Math.round(disc * 30);
  }
  if (input.scraped.rating && input.scraped.rating >= 4) score += 10;
  if (input.scraped.reviewCount && input.scraped.reviewCount > 100) score += 5;
  if (input.features.length >= 3) score += 5;
  return clampScore(score);
}

function fallbackAnalysis(input: ProductAnalysisInput): ProductAnalysis {
  const score = fallbackScore(input);
  return {
    summary: input.name ? `Producto: ${input.name}.` : ND,
    advantages: input.features.slice(0, 3),
    disadvantages: [],
    useCases: [],
    score,
    classification: classificationFromScore(score),
    reasoning: "Análisis basado en los datos reales disponibles. Algunos campos no estaban disponibles.",
    recommendation: input.scraped.price != null ? "Datos insuficientes para una recomendación completa." : ND,
    bestStore: input.scraped.store || null,
    faqs: [],
    metaTitle: (input.name ?? "Producto").slice(0, 70),
    metaDescription: (input.description ?? input.name ?? "Producto en BLACKBOX").slice(0, 165),
    slug: slugify(input.name ?? "producto"),
  };
}
