import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { Card, PageLayout, STATUS_TEXT } from "../components/ui";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, shop: session.shop },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) throw new Response("Not found", { status: 404 });
  return {
    c: {
      ...conversation,
      startedAt: conversation.startedAt.toISOString(),
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      messages: conversation.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    },
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const f = await request.formData();
  if (f.get("intent") === "resolve") {
    await prisma.conversation.updateMany({ where: { id: params.id, shop: session.shop }, data: { status: "answered" } });
  }
  return { ok: true };
};

const FLAG_LABEL: Record<string, string> = {
  blocked: "Blocked by guardrails",
  escalated: "Needs your team",
  unanswered: "Not in knowledge",
  error: "AI error",
  written: "Written answer",
};

export default function ConversationPage() {
  const { c } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  return (
    <s-page heading="Conversation" inlineSize="large">
      <s-button slot="breadcrumb-actions" onClick={() => navigate("/app/conversations")}>
        Conversations
      </s-button>
      {(c.status === "escalated" || c.status === "unanswered") && (
        <s-button slot="primary-action" onClick={() => fetcher.submit({ intent: "resolve" }, { method: "post" })}>
          Mark as handled
        </s-button>
      )}

      <PageLayout title="Conversation" tools={<button type="button" className="ap-btn ap-btn--secondary ap-btn--sm" onClick={() => navigate("/app/conversations")}>All conversations</button>}>
        <Card
          title={c.firstQuestion || "Conversation"}
          description={`Started ${new Date(c.startedAt).toLocaleString()}${c.pageUrl ? ` on ${c.pageUrl}` : ""}`}
          action={
            <span style={{ display: "flex", gap: 6 }}>
              {c.isTest && <span className="ap-tag ap-tag--plain">Test</span>}
              <span className={`ap-tag ap-tag--${c.status}`}>{STATUS_TEXT[c.status] || c.status}</span>
            </span>
          }
          flush
        >
          <div className="ap-chat__feed" style={{ maxHeight: "none" }}>
            {c.messages.map((m) => (
              <div key={m.id} className={`ap-msg ${m.role === "user" ? "ap-msg--user" : "ap-msg--bot"}`}>
                {m.role !== "user" && <span className="ap-avatar">A</span>}
                <div style={{ maxWidth: "80%", display: "grid", gap: 6, justifyItems: m.role === "user" ? "end" : "start" }}>
                  <div className="ap-bubble" style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {m.flag && <span className={`ap-tag ap-tag--${m.flag === "written" ? "info" : m.flag}`}>{FLAG_LABEL[m.flag] || m.flag}</span>}
                    <span className="ap-faint">{new Date(m.createdAt).toLocaleTimeString([], { timeStyle: "short" })}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </PageLayout>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
