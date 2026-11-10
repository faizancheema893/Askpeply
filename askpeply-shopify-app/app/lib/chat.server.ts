import prisma from "../db.server";
import { askAI, type ChatTurn } from "./ai.server";
import { PLANS, planAllows, type BotSettings, type Guardrails, type PlanKey } from "./defaults";
import { precheck } from "./guardrails.server";
import { searchKnowledge } from "./knowledge.server";
import { getShopData, usageThisMonth, type AdminApi } from "./settings.server";
import { findOrderNumber, formatOrderReply, isOrderQuestion, lookupOrder, readOrderState } from "./orders.server";
import { findEmail, logAccess, maskEmails, purgeOldData } from "./privacy.server";

const NO_ANSWER = "[[NO_ANSWER]]";

const TONES: Record<string, string> = {
  professional: "Professional, precise and calm.",
  friendly: "Warm and friendly, but still precise.",
  concise: "Very short and to the point.",
};

function buildSystemPrompt(
  shop: string,
  settings: BotSettings & { storeName?: string },
  g: Guardrails,
  knowledge: { source: string; title: string; content: string; url: string | null }[],
) {
  const store = settings.storeName || shop.replace(".myshopify.com", "");
  const kb = knowledge.length
    ? knowledge
        .map((k, i) => `[${i + 1}] ${k.source.toUpperCase()}: ${k.title}${k.url ? ` (link: ${k.url})` : ""}\n${k.content.slice(0, 1500)}`)
        .join("\n\n")
    : "(no matching store information found)";

  return `You are ${settings.botName}, the AI shopping assistant on the online store "${store}". The store sells research peptides and related products.

TONE: ${TONES[g.tone] || TONES.professional}

RULES
- Answer ONLY from the STORE KNOWLEDGE below. Never use outside knowledge about peptides, never invent products, prices, stock, shipping times, policies or discounts.
- If the answer is not in the store knowledge, start your reply with ${NO_ANSWER} and then say politely that you don't have that information${g.supportEmail ? ` and that the customer can email ${g.supportEmail}` : " and suggest contacting the store's support team"}.
- All products are for research use only. Never give dosing, administration, injection, human-use, medical, health, weight-loss or off-label advice, even if asked directly or indirectly. Decline briefly and offer help with specs, COAs, storage, shipping or policies.
- Never claim a product treats, cures or prevents anything.
- When you mention a product or page, link it with markdown using the link given, e.g. [Product name](/products/handle).
- Keep replies short: 2 to 4 sentences, or at most 4 bullet points. Plain text with **bold** and "- " bullets only. No headings, tables or emojis.
- Reply in the same language the customer writes in.
${g.customInstructions.trim() ? `\nSTORE OWNER INSTRUCTIONS (follow unless they conflict with the rules above)\n${g.customInstructions.trim()}\n` : ""}
STORE KNOWLEDGE
${kb}`;
}

export type ChatInput = {
  shop: string;
  messages: ChatTurn[];
  conversationId?: string | null;
  isTest?: boolean;
  pageUrl?: string | null;
  admin?: AdminApi | null; // needed for order tracking
};

export type ChatResult = {
  reply: string;
  conversationId: string | null;
  status: "answered" | "blocked" | "escalated" | "unanswered" | "limit" | "error";
  reason?: string;
  sources?: { title: string; url: string | null; source: string }[];
};

export async function handleChat(input: ChatInput): Promise<ChatResult> {
  const { shop } = input;
  const messages = (input.messages || [])
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .slice(-12);
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return { reply: "", conversationId: input.conversationId || null, status: "error", reason: "no_question" };
  }
  const question = last.content.trim().slice(0, 1500);

  const { settings, guardrails, plan } = await getShopData(shop);
  const planKey = (plan in PLANS ? plan : "starter") as PlanKey;
  void purgeOldData(shop, guardrails.retentionDays);

  // Find or start the conversation (and enforce the monthly plan limit).
  let conversation = input.conversationId
    ? await prisma.conversation.findFirst({ where: { id: input.conversationId, shop } })
    : null;
  if (!conversation) {
    if (!input.isTest) {
      const used = await usageThisMonth(shop);
      if (used >= PLANS[planKey].conversations) {
        return {
          reply: "Our assistant is unavailable right now. Please contact our support team and we'll be happy to help.",
          conversationId: null,
          status: "limit",
        };
      }
    }
    conversation = await prisma.conversation.create({
      data: { shop, firstQuestion: maskEmails(question).slice(0, 300), isTest: Boolean(input.isTest), pageUrl: input.pageUrl || null },
    });
  }

  // Emails are masked before anything is saved (j***@gmail.com).
  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: maskEmails(question) } });

  let result: ChatResult;
  const check = precheck(question, guardrails, planAllows(planKey, "customTopics"));

  const orderState = readOrderState(messages.filter((m) => m.role === "user").map((m) => m.content));
  const canTrack = settings.orderTracking !== false && planAllows(planKey, "orderTracking") && Boolean(input.admin);

  // Order mode: the latest message asks about an order, or it gives the number/email we just asked for.
  const latestGivesDetails = Boolean(findOrderNumber(question) || findEmail(question));
  const orderMode = isOrderQuestion(question) || (orderState.wantsOrder && latestGivesDetails);

  if (!check.blocked && orderMode && canTrack) {
    result = await answerOrder(shop, conversation.id, orderState, input.admin as AdminApi, guardrails.supportEmail);
  } else if (check.blocked) {
    const escalate = guardrails.escalateBlocked && planAllows(planKey, "escalation");
    result = {
      reply: check.reply || guardrails.refusalMessage,
      conversationId: conversation.id,
      status: escalate ? "escalated" : "blocked",
      reason: check.reason,
    };
  } else {
    const knowledge = await searchKnowledge(shop, messages.slice(-3).map((m) => m.content).join(" "));
    const system = buildSystemPrompt(shop, settings, guardrails, knowledge);
    const ai = await askAI(system, messages.map((m) => ({ ...m, content: maskEmails(m.content) })));
    if (!ai.ok) {
      result = {
        reply: settings.offlineAnswer,
        conversationId: conversation.id,
        status: "error",
        // the exact Gemini error is only shown in the dashboard's test box
        reason: input.isTest ? ai.detail || ai.error : ai.error,
      };
    } else {
      let reply = ai.reply;
      let status: ChatResult["status"] = "answered";
      if (reply.includes(NO_ANSWER)) {
        reply = reply.replace(NO_ANSWER, "").trim();
        status = planAllows(planKey, "escalation") ? "escalated" : "unanswered";
      }
      if (guardrails.appendDisclaimer && guardrails.disclaimer.trim()) {
        reply += `\n\n*${guardrails.disclaimer.trim()}*`;
      }
      result = {
        reply,
        conversationId: conversation.id,
        status,
        sources: knowledge.map((k) => ({ title: k.title, url: k.url, source: k.source })),
      };
    }
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: maskEmails(result.reply),
      flag: result.status === "answered" ? (result.reason === "order" ? "order" : null) : result.status,
    },
  });

  // Worst status wins for the conversation: escalated > blocked > unanswered > answered.
  const order = ["answered", "error", "unanswered", "blocked", "escalated"];
  const newStatus =
    order.indexOf(result.status) > order.indexOf(conversation.status) ? result.status : conversation.status;
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { messageCount: { increment: 2 }, lastMessageAt: new Date(), status: newStatus },
  });

  return result;
}

/** Logs a suggested question that the bar answered with a written answer. */
export async function logWrittenAnswer(shop: string, conversationId: string | null, question: string, answer: string) {
  let conversation = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, shop } })
    : null;
  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { shop, firstQuestion: question.slice(0, 300) } });
  }
  await prisma.message.createMany({
    data: [
      { conversationId: conversation.id, role: "user", content: question.slice(0, 1500) },
      { conversationId: conversation.id, role: "assistant", content: answer.slice(0, 4000), flag: "written" },
    ],
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { messageCount: { increment: 2 }, lastMessageAt: new Date() },
  });
  return conversation.id;
}

async function answerOrder(
  shop: string,
  conversationId: string,
  state: { orderNumber: string | null; email: string | null },
  admin: AdminApi,
  supportEmail: string,
): Promise<ChatResult> {
  const support = supportEmail ? ` or email us at ${supportEmail}` : "";
  if (!state.orderNumber && !state.email) {
    return {
      reply: "I can check that for you. Please send your **order number** (for example #1001) and the **email** you used at checkout.",
      conversationId,
      status: "answered",
      reason: "order",
    };
  }
  if (!state.orderNumber) {
    return { reply: "Thanks. What's your **order number**? It's in your confirmation email, for example #1001.", conversationId, status: "answered", reason: "order" };
  }
  if (!state.email) {
    return {
      reply: `Thanks. To keep your order private, please also send the **email** you used for order ${state.orderNumber.startsWith("#") ? "" : "#"}${state.orderNumber}.`,
      conversationId,
      status: "answered",
      reason: "order",
    };
  }

  // Stop after 3 wrong tries in one conversation, so nobody can guess orders.
  const misses = await prisma.accessLog.count({ where: { shop, conversationId, kind: "order_miss" } });
  if (misses >= 3) {
    return {
      reply: `I couldn't match those details to an order. Please contact our support team${support} and they'll help you right away.`,
      conversationId,
      status: "escalated",
      reason: "order",
    };
  }

  try {
    const order = await lookupOrder(admin, state.orderNumber, state.email);
    if (!order) {
      await logAccess(shop, "order_miss", state.orderNumber, conversationId);
      return {
        reply: `I couldn't find an order with that number and email. Please check both and try again${support}.`,
        conversationId,
        status: "answered",
        reason: "order",
      };
    }
    await logAccess(shop, "order_lookup", order.name, conversationId);
    return { reply: formatOrderReply(order), conversationId, status: "answered", reason: "order" };
  } catch (e) {
    console.error("[askpeply] order lookup failed", String(e));
    return {
      reply: `I can't check orders right now. Please try again in a moment${support}.`,
      conversationId,
      status: "error",
      reason: /access|scope|denied|protected/i.test(String(e)) ? "order access not approved yet" : "order lookup failed",
    };
  }
}
