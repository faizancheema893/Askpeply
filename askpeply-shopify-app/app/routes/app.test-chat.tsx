import type { ActionFunctionArgs } from "react-router";
import prisma from "../db.server";
import { handleChat } from "../lib/chat.server";
import { authenticate } from "../shopify.server";

// Used by the dashboard's "Try your assistant" boxes. Same logic as the
// storefront, but conversations are marked as tests.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return { reply: "Bad request", status: "error", conversationId: null };
  }
  const result = await handleChat({
    shop: session.shop,
    messages: Array.isArray(body.messages) ? body.messages : [],
    conversationId: body.conversationId || null,
    isTest: true,
    admin,
  });
  await prisma.shopSettings.update({ where: { shop: session.shop }, data: { testedAt: new Date() } }).catch(() => {});
  return result;
};
