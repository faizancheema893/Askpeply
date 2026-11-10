import type { Guardrails } from "./defaults";

// Checked BEFORE the AI is called, so risky questions never reach the model.
const PRESETS: Record<string, { label: string; patterns: RegExp[] }> = {
  blockDosing: {
    label: "dosing",
    patterns: [
      /\b(dose|doses|dosage|dosing|microdos\w*)\b/i,
      /\bhow (much|many|often)\b.*\b(take|taking|inject|injecting|use|using|run|running|dose|per day|a day|daily|weekly|per week)\b/i,
      /\b\d+\s?(mg|mcg|µg|iu|units?)\b.*\b(day|daily|week|weekly|night|morning)\b/i,
      /\b(cycle length|how long (should|do) i (run|take|use))\b/i,
    ],
  },
  blockHumanUse: {
    label: "human use",
    patterns: [
      /\b(inject|injecting|injection|injections|subq|sub-q|sub q|subcutaneous\w*|intramuscular\w*|pin it|pinning)\b/i,
      /\b(take it orally|swallow|nasal spray|sublingual\w*)\b/i,
      /\b(safe|okay|ok) (for me |for humans? )?to (take|use|inject)\b/i,
      /\b(can|should) i (take|use|inject|try)\b/i,
    ],
  },
  blockMedical: {
    label: "medical",
    patterns: [
      /\b(cure|cures|treat|treats|treatment|heal|heals|healing|diagnos\w*|disease|illness|symptom\w*|prescri\w*)\b/i,
      /\b(cancer|diabetes|arthritis|tendon|injury|injuries|pain|anxiety|depression|insomnia|alzheimer\w*)\b/i,
      /\b(side effects?|interactions?|pregnan\w*|breastfeed\w*)\b/i,
      /\b(weight loss|lose weight|fat loss|burn fat|anti[- ]?aging)\b/i,
    ],
  },
  blockOffLabel: {
    label: "off-label",
    patterns: [
      /\b(stack|stacks|stacking)\b/i,
      /\b(bodybuild\w*|steroids?|peds?|performance[- ]enhanc\w*|bulking|cutting cycle|gains)\b/i,
    ],
  },
};

export type PrecheckResult = { blocked: boolean; reason?: string; reply?: string };

export function precheck(text: string, g: Guardrails, allowCustomTopics: boolean): PrecheckResult {
  const q = String(text || "");
  for (const key of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
    if (!(g as any)[key]) continue;
    if (PRESETS[key].patterns.some((re) => re.test(q))) {
      return { blocked: true, reason: PRESETS[key].label, reply: g.refusalMessage };
    }
  }
  if (allowCustomTopics && g.blockedTopics.trim()) {
    const lower = q.toLowerCase();
    for (const topic of g.blockedTopics.split(/\r?\n|,/).map((t) => t.trim().toLowerCase()).filter(Boolean)) {
      if (lower.includes(topic)) {
        return { blocked: true, reason: `custom: ${topic}`, reply: g.refusalMessage };
      }
    }
  }
  return { blocked: false };
}
