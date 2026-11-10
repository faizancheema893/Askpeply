import prisma from "../db.server";

const EMAIL_RE = /([a-z0-9._%+-])([a-z0-9._%+-]*)@([a-z0-9.-]+\.[a-z]{2,})/gi;

/** "jane.doe@gmail.com" → "j***@gmail.com" (used before anything is saved). */
export function maskEmails(text: string) {
  return String(text || "").replace(EMAIL_RE, (_m, first, _rest, domain) => `${first}***@${domain}`);
}

export function findEmail(text: string): string | null {
  const m = String(text || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m ? m[0].toLowerCase() : null;
}

/** Records who looked at protected data (order lookups). No emails are stored. */
export async function logAccess(shop: string, kind: string, ref: string, conversationId?: string | null) {
  try {
    await prisma.accessLog.create({ data: { shop, kind, ref: ref.slice(0, 120), conversationId: conversationId || null } });
  } catch (e) {
    console.error("[askpeply] access log failed", String(e));
  }
}

const lastPurge = new Map<string, number>();

/** Deletes conversations (and their messages) older than the store's retention period. Runs at most once an hour per store. */
export async function purgeOldData(shop: string, retentionDays: number) {
  const now = Date.now();
  if (now - (lastPurge.get(shop) || 0) < 60 * 60 * 1000) return;
  lastPurge.set(shop, now);
  const days = Math.max(7, Math.min(730, Number(retentionDays) || 90));
  const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
  try {
    await prisma.conversation.deleteMany({ where: { shop, lastMessageAt: { lt: cutoff } } });
    await prisma.accessLog.deleteMany({ where: { shop, createdAt: { lt: cutoff } } });
  } catch (e) {
    console.error("[askpeply] purge failed", String(e));
  }
}
