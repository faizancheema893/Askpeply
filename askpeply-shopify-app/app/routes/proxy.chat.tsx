import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { handleChat, logWrittenAnswer } from "../lib/chat.server";

// Storefront endpoint. The ask bar calls  /apps/askpeply/chat  on the shop's
// own domain; Shopify's App Proxy forwards it here and signs the request,
// so we know which store it came from.

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.public.appProxy(request);
  return Response.json({ ok: true, service: "askpeply" });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);
  const shop = session?.shop || new URL(request.url).searchParams.get("shop");
  if (!session || !shop) return Response.json({ error: "app_not_installed" }, { status: 404 });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }

  if (body.type === "log" && typeof body.question === "string") {
    const conversationId = await logWrittenAnswer(shop, body.conversationId || null, body.question, String(body.answer || ""));
    return Response.json({ ok: true, conversationId });
  }

  const result = await handleChat({
    shop,
    messages: Array.isArray(body.messages) ? body.messages : [],
    conversationId: body.conversationId || null,
    pageUrl: typeof body.pageUrl === "string" ? body.pageUrl.slice(0, 300) : null,
    admin: (admin as any) || null,
  });
  const status = result.status === "error" && result.reason === "no_question" ? 400 : 200;
  return Response.json(result, { status });
};
