import fs from "node:fs";
import path from "node:path";

// Reads a value from process.env, falling back to the project's .env file
// (so GEMINI_API_KEY works in local development without extra setup).
let fileVars: Record<string, string> | null = null;

function loadEnvFile() {
  if (fileVars) return fileVars;
  fileVars = {};
  try {
    const text = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      fileVars[m[1]] = v;
    }
  } catch {
    // no .env file — fine in production
  }
  return fileVars;
}

export function env(name: string): string {
  return (process.env[name] || loadEnvFile()[name] || "").trim();
}
