export const STATUS_BADGE: Record<string, { label: string; tone: "success" | "critical" | "warning" | "info" | "neutral" }> = {
  answered: { label: "Answered", tone: "success" },
  blocked: { label: "Blocked", tone: "critical" },
  escalated: { label: "Escalated", tone: "warning" },
  unanswered: { label: "Not answered", tone: "info" },
  error: { label: "AI error", tone: "critical" },
};
