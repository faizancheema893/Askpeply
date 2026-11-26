// Shared between the dashboard (browser) and the server.

export type SuggestedQuestion = {
  question: string;
  answer: string; // written answer shown instantly (plain text, **bold** and [links](/x) allowed)
  keywords: string; // comma separated, used when the AI can't be reached
};

export type BotSettings = {
  botName: string;
  placeholder: string;
  typingLines: string; // one per line
  note: string;
  position: "right" | "center" | "left";
  iconMode: "all" | "tablets" | "phones" | "off";
  sideOffset: number;
  bottomOffset: number;
  showMic: boolean;
  accentCyan: string;
  accentViolet: string;
  accentFuchsia: string;
  barBg: string;
  barText: string;
  panelBg: string;
  chipBg: string;
  chipText: string;
  botBg: string;
  botText: string;
  userBg: string;
  userText: string;
  noteColor: string;
  orderTracking: boolean;
  suggested: SuggestedQuestion[];
  fallbackAnswer: string;
  offlineAnswer: string;
  // Filled automatically by "Sync now"
  storeName?: string;
  storeEmail?: string;
};

export type Guardrails = {
  blockDosing: boolean;
  blockHumanUse: boolean;
  blockMedical: boolean;
  blockOffLabel: boolean;
  blockedTopics: string; // one per line
  refusalMessage: string;
  disclaimer: string;
  appendDisclaimer: boolean;
  tone: "professional" | "friendly" | "concise";
  customInstructions: string;
  supportEmail: string;
  escalateBlocked: boolean;
  retentionDays: number;
};

export const DEFAULT_SETTINGS: BotSettings = {
  botName: "AskPeply",
  placeholder: "Ask anything…",
  typingLines:
    "What purity is this batch?\nCan I see the COA?\nHow should I store it?\nIs shipping cold-chain?\nWhat is your refund policy?",
  note: "AI answers can be imperfect. Products are for research use only.",
  position: "right",
  iconMode: "all",
  sideOffset: 24,
  bottomOffset: 20,
  showMic: true,
  accentCyan: "#38BDF8",
  accentViolet: "#8B5CF6",
  accentFuchsia: "#D946EF",
  barBg: "#0D132A",
  barText: "#F2F1EE",
  panelBg: "#0D132A",
  chipBg: "#121934",
  chipText: "#F2F1EE",
  botBg: "#1A2034",
  botText: "#D7D8DC",
  userBg: "#F1EFEA",
  userText: "#0A0A0C",
  noteColor: "#8A90A0",
  orderTracking: true,
  suggested: [
    {
      question: "How long does shipping take?",
      answer: "",
      keywords: "shipping, delivery, ship, arrive",
    },
    {
      question: "Can I see the COA for a product?",
      answer: "",
      keywords: "coa, certificate, purity, lab test",
    },
    {
      question: "What is your refund policy?",
      answer: "",
      keywords: "refund, return, money back",
    },
  ],
  fallbackAnswer:
    "I can help with our products, COAs, shipping, storage and store policies. Try one of the suggested questions or contact our support team.",
  offlineAnswer:
    "I can't reach the assistant right now. Please try again in a moment, or contact our support team.",
};

export const DEFAULT_GUARDRAILS: Guardrails = {
  blockDosing: true,
  blockHumanUse: true,
  blockMedical: true,
  blockOffLabel: true,
  blockedTopics: "",
  refusalMessage:
    "I can't help with dosing, human use or medical questions. All of our products are sold strictly for research use only. I'm happy to help with product specs, COAs, storage, shipping or store policies.",
  disclaimer: "All products are for research use only. Not for human consumption.",
  appendDisclaimer: false,
  tone: "professional",
  customInstructions: "",
  supportEmail: "",
  escalateBlocked: true,
  retentionDays: 90,
};

export type PlanKey = "free" | "starter" | "growth" | "pro";

export const PLANS: Record<
  PlanKey,
  { name: string; price: number; conversations: number; features: string[] }
> = {
  free: {
    name: "Free Trial",
    price: 0,
    conversations: 20,
    features: [
      "20 free AI conversations",
      "1 connected storefront domain",
      "Automatic product & policy sync",
      "Core compliance & safety guardrails",
      "Conversation logs & transcripts",
    ],
  },
  starter: {
    name: "Starter",
    price: 49,
    conversations: 1000,
    features: [
      "1,000 AI conversations / month",
      "1 connected storefront domain",
      "Automatic product & policy sync",
      "Core compliance & medical claim guardrails",
      "Zero-hallucination store knowledge",
      "Customizable floating ask-bar",
      "Conversation history & logs",
    ],
  },
  growth: {
    name: "Growth",
    price: 99,
    conversations: 5000,
    features: [
      "5,000 AI conversations / month",
      "Everything in Starter Plan",
      "Real-time order tracking & lookup in chat",
      "Custom blocked topics & brand guard",
      "Smart team escalation & lead capture",
      "Unanswered questions & demand analytics",
      "Priority response routing via edge gateway",
    ],
  },
  pro: {
    name: "Pro",
    price: 199,
    conversations: 20000,
    features: [
      "20,000 AI conversations / month",
      "Everything in Growth Plan",
      "Custom document & PDF sync (COAs, lab tests)",
      "Lab COA, purity & batch grounding",
      "Deep multi-page document search",
      "High-capacity traffic & peak scaling",
      "Dedicated support & priority monitoring",
    ],
  },
};

export function planAllows(
  plan: string,
  feature: "customTopics" | "escalation" | "customKnowledge" | "documents" | "orderTracking",
) {
  const rank = { free: 0, starter: 1, growth: 2, pro: 3 }[plan as PlanKey] ?? 0;
  if (feature === "customTopics" || feature === "escalation" || feature === "orderTracking") return rank >= 2;
  if (feature === "customKnowledge") return true; // written Q&A is on every plan
  if (feature === "documents") return rank >= 3; // document upload is Pro
  return false;
}

export function mergeSettings(raw: unknown): BotSettings {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<BotSettings>;
  const merged = { ...DEFAULT_SETTINGS, ...s };
  if (!Array.isArray(merged.suggested)) merged.suggested = DEFAULT_SETTINGS.suggested;
  return merged;
}

export function mergeGuardrails(raw: unknown): Guardrails {
  const g = (raw && typeof raw === "object" ? raw : {}) as Partial<Guardrails>;
  return { ...DEFAULT_GUARDRAILS, ...g };
}

/** Every color the merchant can change, in the order shown in the dashboard. */
export const COLOR_FIELDS: { key: keyof BotSettings; label: string; help: string; group: string }[] = [
  { key: "barBg", label: "Bar background", help: "The ask bar and the round chat icon.", group: "Bar" },
  { key: "barText", label: "Bar text", help: "Typed questions and the placeholder.", group: "Bar" },
  { key: "noteColor", label: "Note text", help: "The small note under the open bar.", group: "Bar" },
  { key: "chipBg", label: "Question buttons", help: "Background of the suggested questions.", group: "Suggested questions" },
  { key: "chipText", label: "Question button text", help: "Text on the suggested questions.", group: "Suggested questions" },
  { key: "panelBg", label: "Chat window", help: "Background of the conversation panel.", group: "Conversation" },
  { key: "botBg", label: "Assistant replies", help: "Background of the assistant's messages.", group: "Conversation" },
  { key: "botText", label: "Assistant reply text", help: "Text in the assistant's messages and the chat header.", group: "Conversation" },
  { key: "userBg", label: "Customer messages", help: "Background of what the customer sends.", group: "Conversation" },
  { key: "userText", label: "Customer message text", help: "Text in the customer's messages.", group: "Conversation" },
  { key: "accentCyan", label: "Highlight", help: "Typing cursor, live dot, links and the line beside replies.", group: "Accents" },
  { key: "accentViolet", label: "Glow", help: "Glow around the bar and the assistant's avatar.", group: "Accents" },
  { key: "accentFuchsia", label: "Send button", help: "Send button and hover glow. All three accents blend in the animated border.", group: "Accents" },
];

type ColorSet = Partial<Record<(typeof COLOR_FIELDS)[number]["key"], string>>;

export const THEMES: { key: string; name: string; colors: ColorSet }[] = [
  {
    key: "nebula",
    name: "Nebula",
    colors: {
      barBg: "#0D132A", barText: "#F2F1EE", panelBg: "#0D132A", chipBg: "#121934", chipText: "#F2F1EE",
      botBg: "#1A2034", botText: "#D7D8DC", userBg: "#F1EFEA", userText: "#0A0A0C", noteColor: "#8A90A0",
      accentCyan: "#38BDF8", accentViolet: "#8B5CF6", accentFuchsia: "#D946EF",
    },
  },
  {
    key: "lab",
    name: "Clean lab",
    colors: {
      barBg: "#FFFFFF", barText: "#101828", panelBg: "#FFFFFF", chipBg: "#FFFFFF", chipText: "#101828",
      botBg: "#F2F4F7", botText: "#1D2939", userBg: "#101828", userText: "#FFFFFF", noteColor: "#667085",
      accentCyan: "#0EA5E9", accentViolet: "#6366F1", accentFuchsia: "#0EA5E9",
    },
  },
  {
    key: "emerald",
    name: "Emerald",
    colors: {
      barBg: "#06201A", barText: "#ECFDF5", panelBg: "#06201A", chipBg: "#0B2E25", chipText: "#ECFDF5",
      botBg: "#123B30", botText: "#D1FAE5", userBg: "#ECFDF5", userText: "#06201A", noteColor: "#6B8F84",
      accentCyan: "#34D399", accentViolet: "#10B981", accentFuchsia: "#A3E635",
    },
  },
  {
    key: "graphite",
    name: "Graphite",
    colors: {
      barBg: "#18181B", barText: "#FAFAFA", panelBg: "#18181B", chipBg: "#27272A", chipText: "#FAFAFA",
      botBg: "#27272A", botText: "#E4E4E7", userBg: "#FAFAFA", userText: "#18181B", noteColor: "#8B8B93",
      accentCyan: "#FAFAFA", accentViolet: "#A1A1AA", accentFuchsia: "#F4F4F5",
    },
  },
  {
    key: "rose",
    name: "Rose gold",
    colors: {
      barBg: "#2A1418", barText: "#FFF1F2", panelBg: "#2A1418", chipBg: "#3A1C22", chipText: "#FFF1F2",
      botBg: "#43222A", botText: "#FFE4E6", userBg: "#FFE4E6", userText: "#2A1418", noteColor: "#9F7A80",
      accentCyan: "#FDA4AF", accentViolet: "#F472B6", accentFuchsia: "#FB7185",
    },
  },
];
