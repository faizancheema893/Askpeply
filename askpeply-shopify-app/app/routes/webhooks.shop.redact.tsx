import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * Mandatory Shopify Compliance Webhook: shop/redact
 * Triggered 48 hours after an app uninstalls when Shopify requests store data erasure.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);
  console.log(`[askpeply] Received compliance webhook ${topic} for ${shop}`);

  try {
    // Purge store settings, knowledge base, conversations and access logs
    await prisma.conversation.deleteMany({ where: { shop } });
    await prisma.knowledgeItem.deleteMany({ where: { shop } });
    await prisma.accessLog.deleteMany({ where: { shop } });
    await prisma.shopSettings.deleteMany({ where: { shop } });
    await prisma.session.deleteMany({ where: { shop } });
  } catch (err) {
    console.error("[askpeply] shop/redact cleanup error:", err);
  }

  return new Response(JSON.stringify({ ok: true, message: "Shop data purged successfully." }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
