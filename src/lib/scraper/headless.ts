// Headless browser scraper — fallback for JS-rendered SPAs (Temu, etc).
// Uses the `agent-browser` CLI (Playwright) via spawnSync to render the page
// and extract real product data from the DOM after JavaScript execution.
//
// This is the same approach Google uses: render the page in a real browser,
// then read the fully-built DOM. Slower than static fetch but gets real data
// from sites that render everything client-side.

import { spawnSync } from "child_process";
import type { ScrapedProduct, StoreId } from "./types";
import { detectStore } from "./types";
import { parsePrice } from "./html-parser";

const BROWSER_TIMEOUT = 45_000;
const RENDER_WAIT = 4_000;
// Dedicated session so scraping doesn't hijack the user's viewing session.
const SESSION = "bb-scraper";

/**
 * Scrape a URL using a headless browser. Opens the page, waits for JS render,
 * then extracts product data from the live DOM.
 *
 * Returns a ScrapedProduct with whatever real data was found. Fields are null
 * if not present in the rendered page — never invented.
 */
export async function headlessScrape(url: string): Promise<ScrapedProduct> {
  const store = detectStore(url);
  const warnings: string[] = [];

  // 1. Open the URL in the headless browser (isolated session).
  const openRes = spawnSync("agent-browser", ["--session", SESSION, "open", url], {
    timeout: BROWSER_TIMEOUT,
    encoding: "utf8",
  });
  if (openRes.status !== 0 && !openRes.stdout) {
    warnings.push("No se pudo abrir la página en el navegador headless");
    return emptyScraped(url, store, warnings);
  }

  // 2. Wait for network idle + extra render time.
  spawnSync("agent-browser", ["--session", SESSION, "wait", "--load", "networkidle"], { timeout: 20_000, encoding: "utf8" });
  spawnSync("agent-browser", ["--session", SESSION, "wait", String(RENDER_WAIT)], { timeout: 10_000, encoding: "utf8" });

  // 3. Extract product data from the rendered DOM.
  const extractJs = buildExtractionScript();
  const evalRes = spawnSync("agent-browser", ["--session", SESSION, "eval", extractJs], {
    timeout: 15_000,
    encoding: "utf8",
  });

  const raw = evalRes.stdout?.trim();
  if (!raw) {
    warnings.push("El navegador no devolvió datos (la tienda puede estar bloqueando el navegador headless)");
    return emptyScraped(url, store, warnings);
  }

  let data: RenderedData;
  try {
    data = JSON.parse(raw.startsWith('"') ? JSON.parse(raw) : raw);
  } catch {
    try {
      data = JSON.parse(raw);
    } catch {
      warnings.push("No se pudo parsear la respuesta del navegador");
      return emptyScraped(url, store, warnings);
    }
  }

  // 4. Map rendered data → ScrapedProduct.
  const body = cleanStr(data.body) || cleanStr(data.bodySample) || "";
  let name = cleanStr(data.name) || null;

  // If h1 name is generic/empty, mine the body text for a real product name.
  if (!name || isGenericName(name)) {
    name = mineNameFromBody(body) || name;
  }

  const description = cleanStr(data.desc) || (body.length > 20 ? body.slice(0, 500) : null);

  // Price: mine from body text (server-side, avoids complex JS in the browser)
  const price = minePriceFromBody(body);
  const images = (data.imgs || []).filter((s) => isProductImageUrl(s)).slice(0, 8);

  // Availability: check body text
  const bodyLower = body.toLowerCase();
  let availability: ScrapedProduct["availability"] = "unknown";
  if (bodyLower.includes("discontinued") || bodyLower.includes("agotado") || bodyLower.includes("out of stock") || bodyLower.includes("unavailable")) {
    availability = "out_of_stock";
  } else if (bodyLower.includes("in stock") || bodyLower.includes("disponible")) {
    availability = "in_stock";
  }

  return {
    sourceUrl: url,
    sourceStore: store,
    name,
    description,
    brand: null,
    category: null,
    images,
    features: extractFeaturesFromBody(body),
    specs: {},
    price,
    originalPrice: null,
    currency: body.match(/S\/|PEN|USD|\$/) ? (body.match(/S\/|PEN/) ? "PEN" : "USD") : null,
    availability,
    rating: null,
    reviewCount: null,
    shippingTime: null,
    shippingCost: null,
    metaDescription: cleanStr(data.desc) || null,
    fetchedAt: new Date().toISOString(),
    warnings,
  };
}

/** Check whether the agent-browser CLI is available on this machine. */
export function isHeadlessAvailable(): boolean {
  const r = spawnSync("agent-browser", ["--version"], { timeout: 5_000, encoding: "utf8" });
  return r.status === 0;
}

// ---------- internals ----------

interface RenderedData {
  name?: string;
  desc?: string;
  imgs?: string[];
  body?: string;
  bodySample?: string;
}

/** Detect generic store-homepage titles that aren't product names. */
function isGenericName(name: string): boolean {
  const n = name.toLowerCase().trim();
  return (
    n.startsWith("temu") ||
    n.startsWith("amazon") ||
    n.startsWith("falabella") ||
    n === "page not found" ||
    n === "404" ||
    n.startsWith("just a moment")
  );
}

/**
 * Mine a real product name from rendered body text.
 * Skips navigation/promo lines and picks the first line that looks like a
 * product description.
 */
function mineNameFromBody(body: string): string | null {
  const skip = /^(free|sign|search|categor|support|order|get the|start sell|join|subtotal|min\.|price adj|free return|up to|within|refund|delivery|special for you|this item|item details|quick look|couple|women|men|birthday|present|suitable)/i;
  const lines = body
    .split("\n")
    .map((l) => l.replace(/[\u200b]/g, "").trim())
    .filter((l) => l.length > 20 && l.length < 200 && !skip.test(l));
  return lines[0] || null;
}

/**
 * Mine a price from rendered body text. Looks for currency patterns (S/, $, USD)
 * and excludes "min order" / "shipping" context.
 */
function minePriceFromBody(body: string): number | null {
  // Find all price-like patterns
  const re = /S\/\s*[\d.,]+|\$\s*[\d.,]+|USD\s*[\d.,]+|PEN\s*[\d.,]+/g;
  let m: RegExpExecArray | null;
  const candidates: { price: number; context: string }[] = [];
  while ((m = re.exec(body)) !== null) {
    const ctx = body.slice(Math.max(0, m.index - 40), m.index + m[0].length + 10).toLowerCase();
    // Skip shipping / min order / subtotal context
    if (/min\.?\s*order|shipping|subtotal|order value/.test(ctx)) continue;
    const parsed = parsePrice(m[0]);
    if (parsed != null && parsed > 0) {
      candidates.push({ price: parsed, context: ctx });
    }
  }
  // Return the first valid candidate (usually the main product price)
  return candidates[0]?.price ?? null;
}

function buildExtractionScript(): string {
  // Minimal, quote-safe extraction. Avoids CSS attribute selectors with special
  // chars (colons in og:image break querySelector). Iterates meta tags manually.
  return [
    "(function(){",
    "var t=document.body.innerText||'';",
    "var h1=document.getElementsByTagName('h1')[0];",
    "var metas=document.getElementsByTagName('meta');",
    "var desc='',ogImg='';",
    "for(var i=0;i<metas.length;i++){",
    "var n=metas[i].getAttribute('name');",
    "var p=metas[i].getAttribute('property');",
    "if(n==='description')desc=metas[i].content||'';",
    "if(p==='og:image')ogImg=metas[i].content||'';",
    "}",
    "var imgs=[];",
    "var all=document.getElementsByTagName('img');",
    "for(var j=0;j<all.length;j++){var s=all[j].src;if(s)imgs.push(s);}",
    "if(ogImg)imgs.unshift(ogImg);",
    "var name=h1?h1.innerText.trim():'';",
    "return JSON.stringify({name:name,desc:desc,imgs:imgs.slice(0,10),body:t.slice(0,1200)});",
    "})()"
  ].join("");
}

function cleanStr(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.replace(/[\u200b]/g, "").trim();
}

function isProductImageUrl(s: string): boolean {
  if (!s || !/^https?:\/\//i.test(s)) return false;
  const lower = s.toLowerCase();
  if (lower.includes("icon") || lower.includes("logo") || lower.includes("sprite") || lower.includes("favicon")) return false;
  if (lower.includes("1x1") || lower.includes("pixel")) return false;
  return /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(lower);
}

function extractFeaturesFromBody(body: string): string[] {
  // Pull bullet-like lines from body text
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 15 && l.length < 140)
    .filter((l) => !/^(free|sign|search|categor|support|order|get the|start sell|join|subtotal|min\.|price adj|free return|up to|within|refund|delivery)/i.test(l));
  return lines.slice(0, 5);
}

function emptyScraped(url: string, store: StoreId, warnings: string[]): ScrapedProduct {
  return {
    sourceUrl: url,
    sourceStore: store,
    name: null,
    description: null,
    brand: null,
    category: null,
    images: [],
    features: [],
    specs: {},
    price: null,
    originalPrice: null,
    currency: null,
    availability: "unknown",
    rating: null,
    reviewCount: null,
    shippingTime: null,
    shippingCost: null,
    metaDescription: null,
    fetchedAt: new Date().toISOString(),
    warnings,
  };
}
