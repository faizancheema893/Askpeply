// AskPeply · AI connection check
// Run from the project folder:  node scripts/check-ai.mjs
// Reads GEMINI_API_KEY from .env, lists the Flash models your key can use,
// and times a short question on each. Your key is never printed.
import fs from "node:fs";

let key = process.env.GEMINI_API_KEY || "";
try {
  const env = fs.readFileSync(".env", "utf8");
  const m = env.match(/^\s*GEMINI_API_KEY\s*=\s*(.*)\s*$/m);
  if (m) key = m[1].trim().replace(/^["']|["']$/g, "");
} catch {}

if (!key) {
  console.log("✗ No GEMINI_API_KEY found in .env");
  process.exit(1);
}
console.log(`Key found (${key.length} characters, starts with ${key.slice(0, 4)}…)`);

const base = "https://generativelanguage.googleapis.com/v1beta";
const t0 = Date.now();
let models = [];
try {
  const r = await fetch(`${base}/models?pageSize=1000`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(15000) });
  const j = await r.json();
  if (!r.ok) {
    console.log(`✗ Listing models failed: ${r.status} ${j?.error?.message || ""}`);
    process.exit(1);
  }
  models = (j.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /flash/i.test(n) && !/(image|tts|audio|live|embed|vision|8b)/i.test(n));
  console.log(`✓ Key works. ${models.length} Flash models available (${Date.now() - t0} ms)`);
} catch (e) {
  console.log(`✗ Could not reach Google: ${e.name} ${e.cause?.code || e.message}`);
  process.exit(1);
}

const rank = (n) => {
  const v = parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || "0");
  let s = v * 100;
  if (/preview|exp/i.test(n)) s -= 30;
  if (/lite/i.test(n)) s -= 10;
  if (/-\d{3,}$|-\d{2}-\d{2}/.test(n)) s -= 5;
  return s;
};
models.sort((a, b) => rank(b) - rank(a));
console.log("\nTesting the models the app tries first:\n");

for (const m of models.slice(0, 6)) {
  const t = Date.now();
  try {
    const r = await fetch(`${base}/models/${m}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with the single word: ready" }] }],
        generationConfig: { maxOutputTokens: 256 },
      }),
      signal: AbortSignal.timeout(30000),
    });
    const j = await r.json().catch(() => ({}));
    const ms = Date.now() - t;
    if (r.ok) {
      const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
      console.log(`✓ ${m.padEnd(36)} ${String(ms).padStart(6)} ms  "${text.slice(0, 30)}"`);
    } else {
      console.log(`✗ ${m.padEnd(36)} ${String(ms).padStart(6)} ms  ${r.status} ${(j?.error?.message || "").slice(0, 90)}`);
    }
  } catch (e) {
    console.log(`✗ ${m.padEnd(36)} ${String(Date.now() - t).padStart(6)} ms  ${e.name === "TimeoutError" ? "no answer in 30 s" : e.cause?.code || e.message}`);
  }
}
console.log("\nDone. Copy everything above and send it.");
