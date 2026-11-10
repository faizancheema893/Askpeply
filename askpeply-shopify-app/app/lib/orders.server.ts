import type { AdminApi } from "./settings.server";
import { findEmail } from "./privacy.server";

// "Where is my order?" — the customer gives the order number and the email
// used at checkout. We only answer when both match the same order.

const INTENT = /\b(track(ing)?|where('?s| is)( my)? (order|package|parcel)|order status|status of (my )?order|my order|shipped( yet)?|delivery status|has it shipped|when will (it|my order) (arrive|ship)|order\s*(#|no\.?\s|number))/i;

export function isOrderQuestion(text: string) {
  return INTENT.test(String(text || ""));
}

/** Order numbers look like #1001 or 1001 (3–10 digits). Ignores numbers attached to units like 10mg. */
export function findOrderNumber(text: string): string | null {
  const t = String(text || "").replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, " ");
  const hash = t.match(/#\s?([a-z]{0,4}-?\d{3,10})\b/i);
  if (hash) return hash[1].toUpperCase();
  const plain = t.match(/\border(?:\s+(?:no\.?|number|num|#))?\s*:?\s*([a-z]{0,4}-?\d{3,10})\b/i) || t.match(/(?:^|\s)(\d{3,10})(?=\s|$|[.,!?])/);
  return plain ? plain[1].toUpperCase() : null;
}

export type OrderState = { wantsOrder: boolean; orderNumber: string | null; email: string | null };

/** Looks across the last few customer messages, so they can give the number and email in separate replies. */
export function readOrderState(userMessages: string[]): OrderState {
  const recent = userMessages.slice(-4);
  const wantsOrder = recent.some(isOrderQuestion);
  let orderNumber: string | null = null;
  let email: string | null = null;
  for (const m of recent) {
    orderNumber = findOrderNumber(m) || orderNumber;
    email = findEmail(m) || email;
  }
  return { wantsOrder, orderNumber, email };
}

export type OrderInfo = {
  name: string;
  createdAt: string;
  cancelled: boolean;
  financial: string;
  fulfillment: string;
  items: string[];
  shipments: { status: string; company: string | null; number: string | null; url: string | null; eta: string | null; deliveredAt: string | null }[];
};

export async function lookupOrder(admin: AdminApi, orderNumber: string, email: string): Promise<OrderInfo | null> {
  const name = orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;
  const res = await admin.graphql(
    `#graphql
    query askpeplyOrder($q: String!) {
      orders(first: 3, query: $q, sortKey: CREATED_AT, reverse: true) {
        nodes {
          name email createdAt cancelledAt
          displayFinancialStatus displayFulfillmentStatus
          lineItems(first: 8) { nodes { title quantity } }
          fulfillments(first: 5) {
            displayStatus estimatedDeliveryAt deliveredAt
            trackingInfo(first: 3) { company number url }
          }
        }
      }
    }`,
    { variables: { q: `name:${name}` } },
  );
  const json = (await res.json()) as any;
  if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 300));
  const nodes = json?.data?.orders?.nodes || [];
  const match = nodes.find(
    (o: any) => String(o.name).toUpperCase() === name.toUpperCase() && String(o.email || "").toLowerCase() === email.toLowerCase(),
  );
  if (!match) return null;

  return {
    name: match.name,
    createdAt: match.createdAt,
    cancelled: Boolean(match.cancelledAt),
    financial: match.displayFinancialStatus || "",
    fulfillment: match.displayFulfillmentStatus || "",
    items: (match.lineItems?.nodes || []).map((l: any) => `${l.quantity} × ${l.title}`),
    shipments: (match.fulfillments || []).map((f: any) => {
      const t = (f.trackingInfo || [])[0] || {};
      return {
        status: f.displayStatus || "",
        company: t.company || null,
        number: t.number || null,
        url: t.url || null,
        eta: f.estimatedDeliveryAt || null,
        deliveredAt: f.deliveredAt || null,
      };
    }),
  };
}

const nice = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Builds the reply from the order data itself — the AI never writes order details. */
export function formatOrderReply(o: OrderInfo) {
  const lines: string[] = [];
  let headline: string;
  if (o.cancelled) headline = "has been cancelled";
  else if (o.shipments.some((s) => s.deliveredAt || /delivered/i.test(s.status))) headline = "has been delivered";
  else if (o.shipments.length) headline = "is on its way";
  else if (/unfulfilled|in progress|on hold|scheduled/i.test(o.fulfillment)) headline = "is being prepared and hasn't shipped yet";
  else headline = `status: ${nice(o.fulfillment || "received")}`;

  lines.push(`Your order **${o.name}** ${headline}. It was placed on ${day(o.createdAt)}.`);

  for (const s of o.shipments) {
    const parts: string[] = [];
    if (s.company) parts.push(s.company);
    if (s.number) parts.push(`tracking number ${s.number}`);
    let line = `- ${nice(s.status || "Shipped")}${parts.length ? `: ${parts.join(", ")}` : ""}`;
    if (s.deliveredAt) line += `. Delivered ${day(s.deliveredAt)}`;
    else if (s.eta) line += `. Expected ${day(s.eta)}`;
    if (s.url) line += `. [Track your package](${s.url})`;
    lines.push(line);
  }
  if (!o.shipments.length && !o.cancelled) {
    lines.push("- You'll get an email with the tracking number as soon as it ships.");
  }
  if (o.items.length) lines.push(`Items: ${o.items.slice(0, 4).join(", ")}${o.items.length > 4 ? "…" : ""}`);
  return lines.join("\n");
}
