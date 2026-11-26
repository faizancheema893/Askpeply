import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { getShopData, monthStart, usageThisMonth } from "../lib/settings.server";
import { aiConfigured } from "../lib/ai.server";
import { PLANS, type PlanKey } from "../lib/defaults";
import { TestChat } from "../components/TestChat";
import { BotPreview } from "../components/BotPreview";
import { Card, Icon, PageLayout, STATUS_TEXT } from "../components/ui";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const { row, plan, settings } = await getShopData(shop);
  const since = monthStart();

  const [used, knowledgeCount, blocked, escalated, messages, tests, recent] = await Promise.all([
    usageThisMonth(shop),
    prisma.knowledgeItem.count({ where: { shop } }),
    prisma.conversation.count({ where: { shop, isTest: false, status: "blocked", startedAt: { gte: since } } }),
    prisma.conversation.count({ where: { shop, isTest: false, status: "escalated", startedAt: { gte: since } } }),
    prisma.message.count({ where: { role: "user", conversation: { shop, isTest: false }, createdAt: { gte: since } } }),
    prisma.conversation.count({ where: { shop, isTest: true, startedAt: { gte: since } } }),
    prisma.conversation.findMany({ where: { shop }, orderBy: { lastMessageAt: "desc" }, take: 6 }),
  ]);

  const planKey = (plan in PLANS ? plan : "free") as PlanKey;
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    settings,
    storeName: settings.storeName || shop.replace(".myshopify.com", ""),
    planName: PLANS[planKey].name,
    limit: PLANS[planKey].conversations,
    used,
    blocked,
    escalated,
    messages,
    tests,
    knowledgeCount,
    aiReady: aiConfigured(),
    recent: recent.map((r) => ({ id: r.id, q: r.firstQuestion, status: r.status, isTest: r.isTest, at: r.lastMessageAt.toISOString() })),
    steps: {
      knowledge: knowledgeCount > 0,
      guardrails: Boolean(row.guardrailsSavedAt),
      assistant: Boolean(row.settingsSavedAt),
      tested: Boolean(row.testedAt),
    },
  };
};

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Home() {
  const d = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const editorUrl = `shopify://admin/themes/current/editor?context=apps&activateAppId=${d.apiKey}/askbar`;
  const openEditor = () => window.open(editorUrl, "_top");
  const scrollToTest = () => document.getElementById("ap-test")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const pct = Math.min(100, Math.round((d.used / d.limit) * 100));

  const steps = [
    { done: d.steps.knowledge, title: "Sync your store", sub: d.steps.knowledge ? `${d.knowledgeCount} items the assistant can answer from` : "Import products, pages and policies", label: d.steps.knowledge ? "View" : "Sync now", go: () => navigate("/app/knowledge") },
    { done: d.steps.guardrails, title: "Review guardrails", sub: "Dosing, medical and human-use questions are blocked by default", label: "Review", go: () => navigate("/app/guardrails") },
    { done: d.steps.assistant, title: "Make it yours", sub: "Name, colors and suggested questions", label: "Customize", go: () => navigate("/app/assistant") },
    { done: d.steps.tested, title: "Test a few questions", sub: "Use the chat below", label: "Test", go: scrollToTest },
    { done: false, title: "Turn it on in your theme", sub: "Theme editor → App embeds → AskPeply assistant → Save", label: "Open theme editor", go: openEditor },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <s-page heading="Home" inlineSize="large">
      <PageLayout
        title="Overview"
        description="How your assistant is doing this month."
        aside={
          <>
            <Card title={`${d.planName} plan`} action={<button type="button" className="ap-btn ap-btn--secondary ap-btn--sm" onClick={() => navigate("/app/plans")}>Change</button>}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span className="ap-muted">Conversations this month</span>
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                  {d.used.toLocaleString()} / {d.limit.toLocaleString()}
                </strong>
              </div>
              <div className="ap-meter">
                <span style={{ width: `${Math.max(1.5, pct)}%` }} />
              </div>
              <span className="ap-faint">
                Live store chats only. {d.tests} test chat{d.tests === 1 ? "" : "s"} this month don't count.
              </span>
            </Card>

            <Card
              title="Latest conversations"
              flush
              action={<button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => navigate("/app/conversations")}>See all</button>}
            >
              {d.recent.length === 0 ? (
                <div className="ap-empty">
                  <span className="ap-muted">Chats from your store appear here.</span>
                </div>
              ) : (
                <div className="ap-rows">
                  {d.recent.map((r) => (
                    <button key={r.id} type="button" className="ap-row" onClick={() => navigate(`/app/conversations/${r.id}`)}>
                      <div className="ap-row__main">
                        <span className="ap-row__title">{r.q || "(no question)"}</span>
                        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span className={`ap-tag ap-tag--${r.status}`}>{STATUS_TEXT[r.status] || r.status}</span>
                          {r.isTest && <span className="ap-tag ap-tag--plain">Test</span>}
                        </span>
                      </div>
                      <span className="ap-row__meta">{ago(r.at)}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </>
        }
      >
        <div className="ap-hero">
          <div className="ap-hero__copy">
            <span className="ap-hero__status">
              <span className={`ap-livedot ${d.aiReady ? "" : "ap-livedot--off"}`} />
              {d.aiReady ? "AI connected" : "AI key missing: add GEMINI_API_KEY to .env"}
            </span>
            <h2 className="ap-hero__title">
              {d.settings.botName} is ready to answer for {d.storeName}
            </h2>
            <p className="ap-hero__text">
              Every reply comes from your own products and policies. Dosing, medical and human-use questions are stopped
              before they reach the AI.
            </p>
            <div className="ap-hero__actions">
              <button type="button" className="ap-btn ap-btn--pearl" onClick={openEditor}>
                Turn on in theme
              </button>
              <button type="button" className="ap-btn ap-btn--glass" onClick={() => navigate("/app/assistant")}>
                Customize
              </button>
            </div>
          </div>
          <div className="ap-hero__stage">
            <BotPreview s={{ ...d.settings, position: "center", bottomOffset: 150 }} state="closed" page="none" variant="hero" />
          </div>
        </div>

        <section className="ap-card ap-metrics">
          <div className="ap-metric">
            <span className="ap-metric__label"><Icon name="chat" />Conversations</span>
            <span className="ap-metric__value">{d.used.toLocaleString()}</span>
            <span className="ap-metric__hint">this month</span>
          </div>
          <div className="ap-metric">
            <span className="ap-metric__label"><Icon name="spark" />Questions answered</span>
            <span className="ap-metric__value">{d.messages.toLocaleString()}</span>
            <span className="ap-metric__hint">this month</span>
          </div>
          <div className="ap-metric">
            <span className="ap-metric__label"><Icon name="shield" />Blocked</span>
            <span className="ap-metric__value">{d.blocked.toLocaleString()}</span>
            <span className="ap-metric__hint">risky questions stopped</span>
          </div>
          <div className="ap-metric">
            <span className="ap-metric__label"><Icon name="flag" />Need your team</span>
            <span className="ap-metric__value">{d.escalated.toLocaleString()}</span>
            <span className="ap-metric__hint">escalated chats</span>
          </div>
        </section>

        {doneCount < 5 && (
          <Card title="Get set up" description={`${doneCount} of 5 steps done`} flush>
            <div className="ap-check">
              {steps.map((s, i) => (
                <div key={s.title} className={`ap-check__row ${s.done ? "ap-check__row--done" : ""}`}>
                  <span className="ap-check__num">{s.done ? <Icon name="check" size={14} stroke={3} /> : i + 1}</span>
                  <div className="ap-row__main">
                    <span className="ap-check__title">{s.title}</span>
                    <span className="ap-row__sub">{s.sub}</span>
                  </div>
                  <button type="button" className="ap-btn ap-btn--secondary ap-btn--sm" onClick={s.go}>
                    {s.label}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <TestChat
          id="ap-test"
          suggestions={d.settings.suggested.map((s) => s.question).filter(Boolean).slice(0, 3)}
          risky={["What dose should I take?"]}
        />
      </PageLayout>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
