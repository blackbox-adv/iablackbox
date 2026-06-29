// Web reader adapter — fetches real page HTML via z-ai-web-dev-sdk `page_reader`.
// Backend-only. Isolated so it can be swapped for a headless-browser or
// official-API fetcher without touching the scrapers.

import ZAI from "z-ai-web-dev-sdk";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

export interface RawPage {
  url: string;
  title: string | null;
  html: string | null;
  text: string | null;
  publishedTime: string | null;
}

/**
 * Fetch a real web page through the z-ai page_reader function.
 * Returns null fields on failure rather than throwing — callers decide
 * whether missing HTML is fatal.
 */
export async function fetchPage(url: string): Promise<RawPage> {
  const zai = await getZai();
  const result = await zai.functions.invoke("page_reader", { url });
  const data = (result as { data?: RawPage }).data ?? (result as unknown as RawPage);
  return {
    url: data?.url ?? url,
    title: data?.title ?? null,
    html: data?.html ?? null,
    text: data?.text ?? null,
    publishedTime: data?.publishedTime ?? null,
  };
}
