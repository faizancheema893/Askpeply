import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

// On Vercel the preset packages the server as Vercel Functions.
// Locally (shopify app dev) nothing changes.
export default {
  ssr: true,
  presets: process.env.VERCEL ? [vercelPreset()] : [],
} satisfies Config;
