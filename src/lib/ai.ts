// BLACKBOX AI engine - backend only. Uses the unified ai-client (z-ai or Gemini).
import { chatComplete, getAiConfig } from "./ai-client";
import type { Offer, AiTone } from "./types";
import { classificationFromScore } from "./constants";

const TONE_PROMPTS: Record<AiTone, string> = {
  simple:
    "Eres un asesor de compras experto. Hablas claro y directo, sin tecnicismos. Usas frases cortas y recomendaciones accionables.",
  tecnico:
    "Eres un asesor de compras técnico. Incluye especificaciones relevantes y datos concretos para justificar la recomendación.",
  vendedor:
    "Eres un asesor de compras persuasivo. Enfoca en beneficios y ventajas con un tono cercano que invita a decidir.",
  neutral:
    "Eres un asesor de compras objetivo. Presentas solo hechos verificables y dejas la decisión al usuario.",
};

export interface AiScoreInput {
  productName: string;
  description: string;
  features: string[];
  offers: Offer[];
}

export interface AiScoreResult {
  score: number;
  classification: string;
  reasoning: string;
  recommendation: string;
  bestStore: string;
  summary: string;
}

/**
 * Generate an AI score (0-100) for a product based on its offers.
 */
export async function generateAiScore(
  input: AiScoreInput,
  tone: AiTone = "simple"
): Promise<AiScoreResult> {
  const config = await getAiConfig();
  const offersText = input.offers
    .map(
      (o) =>
        `- ${o.store}: S/${o.price.toFixed(2)}${
          o.originalPrice ? ` (antes S/${o.originalPrice.toFixed(2)})` : ""
        }, envío ${o.shippingTime}, disponibilidad ${o.availability}, rating ${
          o.rating ?? "N/A"
        } (${o.reviewCount} reseñas)`
    )
    .join("\n");

  const systemPrompt = `${TONE_PROMPTS[tone]}

Analizas productos y generas un score de compra de 0 a 100. Respondes SIEMPRE con JSON válido, sin texto adicional.`;

  const userPrompt = `Producto: ${input.productName}
Descripción: ${input.description}
Características: ${input.features.join(", ")}

Ofertas en tiendas:
${offersText}

Genera un análisis. Responde con este JSON exacto:
{
  "score": <número 0-100>,
  "summary": "<resumen simple del producto en 1-2 frases>",
  "reasoning": "<explicación del score: compara precios, envío y calidad entre tiendas>",
  "recommendation": "<recomendación clara de qué tienda elegir y por qué>",
  "bestStore": "<amazon | temu | falabella>"
}

Criterios del score:
- 85-100: excelente compra (precio muy competitivo y/o gran descuento)
- 70-84: buena compra
- 50-69: regular
- 0-49: no recomendable`;

  try {
    const raw = await chatComplete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      config
    );
    const json = extractJson(raw);
    const score = Math.max(0, Math.min(100, Number(json.score) || 0));
    return {
      score,
      classification: classificationFromScore(score),
      reasoning: String(json.reasoning || ""),
      recommendation: String(json.recommendation || ""),
      bestStore: String(json.bestStore || ""),
      summary: String(json.summary || ""),
    };
  } catch (err) {
    console.error("AI score generation failed:", err);
    // Fallback: deterministic score from offers
    return fallbackScore(input);
  }
}

/**
 * Generate a richer recommendation block for a product detail page.
 * Includes best option, cheap alternative, premium alternative.
 */
export async function generateRecommendation(
  input: AiScoreInput,
  tone: AiTone = "simple"
): Promise<{
  summary: string;
  bestOption: string;
  cheapAlternative: string;
  premiumAlternative: string;
}> {
  const config = await getAiConfig();
  const sorted = [...input.offers].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];
  const premium = sorted[sorted.length - 1];

  const systemPrompt = `${TONE_PROMPTS[tone]}

Generas recomendaciones de compra. Respondes SIEMPRE con JSON válido, sin texto adicional.`;

  const userPrompt = `Producto: ${input.productName}
Descripción: ${input.description}
Ofertas:
${input.offers
  .map(
    (o) =>
      `- ${o.store}: S/${o.price.toFixed(2)}, envío ${o.shippingTime}, rating ${
        o.rating ?? "N/A"
      }`
  )
  .join("\n")}

Tienda más barata: ${cheapest?.store} (S/${cheapest?.price.toFixed(2)})
Tienda más cara: ${premium?.store} (S/${premium?.price.toFixed(2)})

Responde con este JSON:
{
  "summary": "<resumen simple del producto y si conviene comprar>",
  "bestOption": "<qué tienda es la mejor opción y por qué>",
  "cheapAlternative": "<alternativa más barata y sus trade-offs>",
  "premiumAlternative": "<alternativa con mejor garantía/servicio>"
}`;

  try {
    const raw = await chatComplete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      config
    );
    const json = extractJson(raw);
    return {
      summary: String(json.summary || ""),
      bestOption: String(json.bestOption || ""),
      cheapAlternative: String(json.cheapAlternative || ""),
      premiumAlternative: String(json.premiumAlternative || ""),
    };
  } catch (err) {
    console.error("AI recommendation failed:", err);
    return {
      summary: "No se pudo generar el resumen de IA en este momento.",
      bestOption: `Recomendado: ${cheapest?.store ?? "—"}.`,
      cheapAlternative: `Más barato: ${cheapest?.store ?? "—"}.`,
      premiumAlternative: `Mejor garantía: Amazon.`,
    };
  }
}

/**
 * Analyze a search query to understand intent and suggest category/filters.
 */
export async function analyzeSearchIntent(query: string): Promise<{
  intent: string;
  suggestedCategory: string | null;
  keywords: string[];
}> {
  const config = await getAiConfig();
  const systemPrompt = `Analizas intenciones de búsqueda de productos. Respondes SIEMPRE con JSON válido.`;
  const userPrompt = `Consulta del usuario: "${query}"

Categorías posibles: Tecnología, Audio, Gaming, Gadgets virales, Accesorios móviles.

Responde con JSON:
{
  "intent": "<descripción breve de lo que busca el usuario>",
  "suggestedCategory": "<categoría sugerida o null>",
  "keywords": ["<palabras clave para buscar productos>"]
}`;

  try {
    const raw = await chatComplete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      config
    );
    const json = extractJson(raw);
    return {
      intent: String(json.intent || query),
      suggestedCategory: json.suggestedCategory || null,
      keywords: Array.isArray(json.keywords) ? json.keywords.map(String) : [],
    };
  } catch {
    return { intent: query, suggestedCategory: null, keywords: [] };
  }
}

function extractJson(text: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // extract first {...} block
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* ignore */
      }
    }
  }
  return {};
}

function fallbackScore(input: AiScoreInput): AiScoreResult {
  if (input.offers.length === 0) {
    return {
      score: 40,
      classification: "regular",
      reasoning: "Sin ofertas disponibles para comparar.",
      recommendation: "Espera a que haya ofertas disponibles.",
      bestStore: "",
      summary: input.description.slice(0, 100),
    };
  }
  const prices = input.offers.map((o) => o.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = max - min;
  const avgDiscount =
    input.offers.reduce(
      (acc, o) => acc + (o.originalPrice ? (o.originalPrice - o.price) / o.originalPrice : 0),
      0
    ) / input.offers.length;
  let score = 60;
  if (spread / min > 0.3) score += 15;
  if (avgDiscount > 0.25) score += 15;
  if (avgDiscount > 0.15) score += 8;
  score = Math.max(0, Math.min(100, score));
  const cheapest = input.offers.find((o) => o.price === min);
  return {
    score,
    classification: classificationFromScore(score),
    reasoning: `Comparación de precios entre tiendas. Mejor precio en ${cheapest?.store} (S/${min.toFixed(2)}). Diferencia máxima de S/${spread.toFixed(2)}.`,
    recommendation: `El mejor precio está en ${cheapest?.store}. Considera envío y garantía al decidir.`,
    bestStore: cheapest?.store ?? "",
    summary: input.description.slice(0, 120),
  };
}
