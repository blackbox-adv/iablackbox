// POST /api/products/import-photo — extract product data from an uploaded
// screenshot/photo using the Vision Language Model (VLM).
//
// The admin takes a screenshot of a product page (Temu, Amazon, etc.) and
// uploads it. The VLM reads the image and extracts real product data:
// name, price, description, brand, features, specs. The admin pastes the
// affiliate link separately — the photo gives the DATA, the link gives the
// MONETIZATION.
//
// Real-data-only: the VLM is told to return "No disponible" for anything it
// can't read, never to invent values.

import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

interface PhotoImportBody {
  image: string; // base64 data URL: data:image/jpeg;base64,....
  affiliateUrl?: string; // optional affiliate link the admin pasted
}

interface ExtractedProduct {
  name: string | null;
  description: string | null;
  brand: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: string | null;
  features: string[];
  specs: Record<string, string>;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  availability: string | null;
}

const ND = "No disponible";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as PhotoImportBody | null;
    if (!body?.image || !body.image.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Se requiere una imagen (data URL base64)" },
        { status: 400 }
      );
    }

    // Limit image size (~8MB base64) to protect the API
    if (body.image.length > 11_000_000) {
      return NextResponse.json(
        { error: "La imagen es demasiado grande (max ~8MB)" },
        { status: 413 }
      );
    }

    const zai = await getZai();

    const systemPrompt = `Eres un asistente experto en extraer datos de productos desde capturas de pantalla de tiendas online (Temu, Amazon, Falabella, etc).

REGLA CRITICA - INTEGRIDAD DE DATOS:
- Extraes UNICAMENTE lo que ves claramente en la imagen.
- NUNCA inventes ni asumas precios, ratings, resenas, especificaciones, marcas ni ningun dato que no sea legible.
- Si un dato no se ve en la imagen, responde "No disponible" para ese campo.
- Respondes SIEMPRE con JSON valido, sin texto adicional, sin markdown.`;

    const userPrompt = `Analiza esta captura de pantalla de un producto y extrae toda la informacion disponible.

Responde con este JSON exacto:
{
  "name": "Nombre exacto del producto tal como aparece",
  "description": "Descripcion del producto si es visible (sino 'No disponible')",
  "brand": "Marca si es visible (sino 'No disponible')",
  "price": "precio actual como numero (ej: 45.90) o 'No disponible'",
  "originalPrice": "precio anterior tachado como numero o 'No disponible'",
  "currency": "moneda visible (PEN, USD, CAD, etc) o 'No disponible'",
  "features": ["caracteristica 1 visible", "caracteristica 2"],
  "specs": {"Especificacion": "valor", "Otra": "valor"},
  "category": "categoria del producto (Tecnologia, Audio, Gaming, Gadgets virales, Accesorios moviles) o 'No disponible'",
  "rating": "valoracion como numero 0-5 o 'No disponible'",
  "reviewCount": "numero de resenas o 'No disponible'",
  "availability": "disponibilidad (in_stock, low_stock, out_of_stock) o 'unknown'"
}

Recuerda: SOLO lo que ves. Si no lo ves, es 'No disponible'.`;

    const completion = await zai.chat.completions.createVision({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt + "\n\n" + userPrompt },
            { type: "image_url", image_url: { url: body.image } },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const extracted = parseExtracted(raw);

    // If we couldn't extract even a name, tell the admin
    if (!extracted.name) {
      return NextResponse.json(
        {
          error:
            "No se pudo leer el nombre del producto en la imagen. Toma una captura mas clara donde se vea el titulo del producto.",
          raw,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      extracted,
      affiliateUrl: body.affiliateUrl ?? null,
    });
  } catch (err) {
    console.error("POST /api/products/import-photo failed:", err);
    return NextResponse.json(
      { error: "Error al analizar la imagen: " + (err as Error).message },
      { status: 500 }
    );
  }
}

function parseExtracted(raw: string): ExtractedProduct {
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        json = JSON.parse(m[0]);
      } catch {
        /* leave empty */
      }
    }
  }

  const str = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    if (!t || t === ND) return null;
    return t;
  };

  const num = (v: unknown): number | null => {
    if (typeof v === "number" && !isNaN(v)) return v;
    if (typeof v === "string") {
      const t = v.trim();
      if (!t || t === ND) return null;
      const cleaned = t
        .replace(/[^\d.,]/g, "")
        .replace(/\.(?=\d{3}\b)/g, "")
        .replace(",", ".");
      const n = parseFloat(cleaned);
      if (!isNaN(n)) return n;
    }
    return null;
  };

  const arr = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => x && x !== ND)
      .slice(0, 8);
  };

  const obj = (v: unknown): Record<string, string> => {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const s = typeof val === "string" ? val.trim() : String(val ?? "");
      if (s && s !== ND) out[k] = s;
    }
    return out;
  };

  return {
    name: str(json.name),
    description: str(json.description),
    brand: str(json.brand),
    price: num(json.price),
    originalPrice: num(json.originalPrice),
    currency: str(json.currency),
    features: arr(json.features),
    specs: obj(json.specs),
    category: str(json.category),
    rating: num(json.rating),
    reviewCount: num(json.reviewCount) ? Math.round(num(json.reviewCount) as number) : null,
    availability: str(json.availability),
  };
}
