import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Mandatory Shopify Compliance Webhook: customers/redact
 * Triggered when a customer requests their data be erased.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);
  console.log(`[askpeply] Received compliance webhook ${topic} for ${shop}`);

  // AskPeply does not store identifiable customer profiles.
  return new Response(JSON.stringify({ ok: true, message: "Customer data erased or masked." }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
