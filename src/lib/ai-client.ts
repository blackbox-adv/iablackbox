// BLACKBOX unified AI client — routes to either the built-in z-ai SDK or a
// custom Gemini API key, based on the AiSetting table.
//
// Architecture: every AI module calls chatComplete() / visionComplete() here.
// Switching providers is a settings change in the Control Center — zero code
// changes to the modules.
//
// Supported providers:
//   - "z-ai" (default): uses z-ai-web-dev-sdk (no key needed)
//   - "gemini": uses Google Gemini REST API with the admin's API key
//
// Future providers (OpenAI, Claude, etc.) can be added here implementing the
// same two functions.

import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

export type AiProvider = "z-ai" | "gemini";

export interface AiConfig {
  provider: AiProvider;
  apiKey: string | null;
  model: string; // e.g. "gemini-2.0-flash"
  tone: string; // simple | tecnico | vendedor | neutral
}

/** Read the current AI configuration from the AiSetting table. */
export async function getAiConfig(): Promise<AiConfig> {
  const rows = await db.aiSetting.findMany({
    where: { key: { in: ["ai_provider", "ai_api_key", "ai_model", "ai_tone"] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    provider: (map.get("ai_provider") as AiProvider) || "z-ai",
    apiKey: map.get("ai_api_key") || null,
    model: map.get("ai_model") || "gemini-2.0-flash",
    tone: map.get("ai_tone") || "simple",
  };
}

// ---------- unified message types ----------

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface VisionMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

// ---------- text chat completion ----------

/**
 * Send a text chat completion. Routes to the configured provider.
 * Returns the assistant's text response.
 */
export async function chatComplete(
  messages: ChatMessage[],
  _config?: AiConfig
): Promise<string> {
  const config = _config ?? (await getAiConfig());

  if (config.provider === "gemini" && config.apiKey) {
    return geminiChat(messages, config);
  }
  // default: z-ai
  const zai = await getZai();
  const completion = await zai.chat.completions.create({
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

// ---------- vision completion ----------

/**
 * Send a vision (multimodal) completion with an image. Routes to the configured
 * provider. The image is passed as a data URL (data:image/jpeg;base64,...).
 */
export async function visionComplete(
  messages: VisionMessage[],
  _config?: AiConfig
): Promise<string> {
  const config = _config ?? (await getAiConfig());

  if (config.provider === "gemini" && config.apiKey) {
    return geminiVision(messages, config);
  }
  // default: z-ai createVision
  const zai = await getZai();
  const completion = await zai.chat.completions.createVision({
    messages: messages.map((m) => ({
      role: m.role,
      content: Array.isArray(m.content)
        ? m.content
        : [{ type: "text", text: m.content }],
    })),
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

// ---------- Gemini REST API implementation ----------

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function geminiChat(messages: ChatMessage[], config: AiConfig): Promise<string> {
  // Gemini uses "contents" with role "user"/"model". System messages are
  // folded into the first user message as a preamble.
  const contents = toGeminiContents(messages);
  const url = `${GEMINI_BASE}/${config.model}:generateContent?key=${config.apiKey}`;
  const body = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  return text || "";
}

async function geminiVision(messages: VisionMessage[], config: AiConfig): Promise<string> {
  // Convert messages to Gemini format with inline_data for images.
  const contents = messages.map((m) => {
    const parts: unknown[] = [];
    if (typeof m.content === "string") {
      parts.push({ text: m.content });
    } else {
      for (const part of m.content) {
        if (part.type === "text") {
          parts.push({ text: part.text });
        } else if (part.type === "image_url") {
          // image_url.url is a data URL: data:image/jpeg;base64,XXXX
          const dataUrl = part.image_url.url;
          const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: { mimeType: match[1], data: match[2] },
            });
          }
        }
      }
    }
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const url = `${GEMINI_BASE}/${config.model}:generateContent?key=${config.apiKey}`;
  const body = {
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini Vision API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  return text || "";
}

/** Convert ChatMessage[] to Gemini "contents" format (fold system into user). */
function toGeminiContents(messages: ChatMessage[]): Array<{ role: string; parts: { text: string }[] }> {
  let systemPreamble = "";
  const userMessages: ChatMessage[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemPreamble += (systemPreamble ? "\n\n" : "") + m.content;
    } else {
      userMessages.push(m);
    }
  }
  return userMessages.map((m, i) => {
    const text = i === 0 && systemPreamble ? `${systemPreamble}\n\n${m.content}` : m.content;
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    };
  });
}

/** Test the configured AI provider with a simple ping. Returns true if OK. */
export async function testAiConfig(config: AiConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await chatComplete(
      [{ role: "user", content: "Responde solo con: OK" }],
      config
    );
    return { ok: response.trim().length > 0 };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
