import { env } from "./env.server";

// Gemini with automatic fallback to other Flash models (ported from the
// AskPeply Cloudflare Worker). Free-tier models are sometimes busy (503) or
// hit their per-minute limit (429); limits are per model, so we move on.

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_MODELS_PER_QUESTION = 5;
const TIME_BUDGET_MS = 32000;
const ATTEMPT_TIMEOUT_MS = 9000;
const SLOW_PAUSE_MS = 30 * 60 * 1000;
let modelCache: { at: number; list: string[] } = { at: 0, list: [] };

// Some brand-new models accept requests but never answer on the free tier.
// A model that times out is skipped for 30 minutes; the last model that
// answered is tried first next time.
const slowUntil = new Map<string, number>();
let lastGood = "";
const isSlow = (m: string) => (slowUntil.get(m) || 0) > Date.now();

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function aiConfigured() {
  return Boolean(env("GEMINI_API_KEY"));
}

function rank(name: string) {
  const v = parseFloat((name.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || "0");
  let score = v * 100;
  if (/preview|exp/i.test(name)) score -= 30;
  if (/lite/i.test(name)) score -= 10;
  if (/-\d{3,}$|-\d{2}-\d{2}/.test(name)) score -= 5;
  return score;
}

async function candidateModels(apiKey: string, preferred: string) {
  const fresh = Date.now() - modelCache.at < 60 * 60 * 1000;
  if (!fresh || !modelCache.list.length) {
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
        headers: { "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(8000),
      });
      const data = (await res.json()) as any;
      const names: string[] = (data.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => String(m.name || "").replace(/^models\//, ""))
        .filter((n: string) => /flash/i.test(n) && !/(image|tts|audio|live|embed|vision|8b)/i.test(n));
      names.sort((a, b) => rank(b) - rank(a));
      if (names.length) modelCache = { at: Date.now(), list: names };
      else if (data?.error) console.error("[askpeply] Gemini model list error:", data.error.message || data.error);
    } catch (e) {
      console.error("[askpeply] could not list Gemini models", String(e));
    }
  }
  // Use the model set in GEMINI_MODEL first; otherwise the best Flash model this key can use.
  const list = modelCache.list.length ? modelCache.list : [DEFAULT_MODEL];
  const ordered = [preferred, lastGood, ...list].filter((n, i, a) => n && a.indexOf(n) === i);
  const ready = ordered.filter((n) => !isSlow(n));
  return ready.length ? ready : ordered;
}

function toGeminiContents(messages: ChatTurn[]) {
  const out: { role: string; parts: { text: string }[] }[] = [];
  for (const m of messages.slice(-12)) {
    const text = String(m.content || "").trim().slice(0, 1500);
    if (!text) continue;
    const role = m.role === "assistant" ? "model" : "user";
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n\n" + text;
    else out.push({ role, parts: [{ text }] });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

async function askOnce(apiKey: string, model: string, system: string, contents: unknown) {
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
        // Never let one slow model hang the chat.
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      },
    );
  } catch (e: any) {
    const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
    return {
      ok: false,
      status: 0,
      timedOut,
      detail: timedOut
        ? `${model} did not answer within ${ATTEMPT_TIMEOUT_MS / 1000} seconds`
        : "Could not reach Gemini: " + String(e?.cause?.code || e?.message || e),
    };
  }
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    let detail = text.slice(0, 400);
    try { detail = JSON.parse(text).error.message || detail; } catch { /* keep text */ }
    return { ok: false, status: res.status, detail };
  }
  let data: any = {};
  try { data = JSON.parse(text); } catch { /* empty */ }
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const reply = parts.filter((p: any) => !p.thought).map((p: any) => p.text || "").join("").trim();
  if (!reply) return { ok: false, status: 200, detail: "Empty reply" };
  return { ok: true, status: 200, reply };
}

export async function askAI(system: string, messages: ChatTurn[]) {
  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) return { ok: false as const, error: "missing_api_key", detail: "GEMINI_API_KEY is not set in .env" };
  const contents = toGeminiContents(messages);
  if (!contents.length) return { ok: false as const, error: "no_question", detail: "" };

  const started = Date.now();
  const models = (await candidateModels(apiKey, env("GEMINI_MODEL"))).slice(0, MAX_MODELS_PER_QUESTION);
  const attempts: { model: string; status: number; detail?: string }[] = [];
  for (const m of models) {
    for (let tryNo = 0; tryNo < 2; tryNo++) {
      if (Date.now() - started > TIME_BUDGET_MS) return { ok: false as const, error: "timeout", detail: "Gemini took too long", attempts };
      const r: any = await askOnce(apiKey, m, system, contents);
      attempts.push({ model: m, status: r.status, detail: r.ok ? undefined : r.detail });
      if (r.ok) {
        lastGood = m;
        slowUntil.delete(m);
        return { ok: true as const, reply: r.reply as string, model: m };
      }
      if (r.timedOut) {
        // Don't wait on this model again for a while — move straight on.
        slowUntil.set(m, Date.now() + SLOW_PAUSE_MS);
        if (lastGood === m) lastGood = "";
        break;
      }
      if ([0, 500, 503].includes(r.status) && tryNo === 0) {
        await new Promise((res) => setTimeout(res, 800));
        continue;
      }
      break;
    }
  }
  console.error("[askpeply] all Gemini attempts failed", JSON.stringify(attempts));
  const first = attempts.find((a) => a.detail) || attempts[0];
  const detail = first ? `${first.model} → ${first.status || "no connection"}: ${first.detail || ""}`.slice(0, 220) : "";
  return { ok: false as const, error: "upstream_error", detail, attempts };
}

/**
 * Reads the text out of an uploaded PDF using Gemini (no extra packages).
 * Used for Pro "upload your own documents".
 */
export async function extractPdfText(base64: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is not set" };
  const models = (await candidateModels(apiKey, env("GEMINI_MODEL"))).slice(0, 3);
  let lastError = "";
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { inline_data: { mime_type: "application/pdf", data: base64 } },
                  {
                    text: "Copy out all of the text in this document as plain text. Keep headings, tables (as 'label: value' lines) and numbers exactly. Do not summarise or add anything.",
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0, maxOutputTokens: 8192 },
          }),
          signal: AbortSignal.timeout(90000),
        },
      );
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        lastError = data?.error?.message || `HTTP ${res.status}`;
        continue;
      }
      const text = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("").trim();
      if (text) return { ok: true, text };
      lastError = "No text found in the PDF";
    } catch (e: any) {
      lastError = String(e?.message || e);
    }
  }
  return { ok: false, error: lastError || "Could not read the PDF" };
}
