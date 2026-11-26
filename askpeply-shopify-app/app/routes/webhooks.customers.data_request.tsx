import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Mandatory Shopify Compliance Webhook: customers/data_request
 * Triggered when a customer requests their data from the merchant.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);
  console.log(`[askpeply] Received compliance webhook ${topic} for ${shop}`);

  // AskPeply does not store personal customer profiles.
  // Emails in customer conversation transcripts are automatically masked (e.g. j***@gmail.com).
  return new Response(JSON.stringify({ ok: true, message: "No unmasked personal data stored." }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
