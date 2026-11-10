import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { Card, PageLayout, STATUS_TEXT, Tabs } from "../components/ui";

const FILTERS = [
  { key: "all", label: "All", icon: "chat" },
  { key: "escalated", label: "Needs your team", icon: "flag" },
  { key: "blocked", label: "Blocked", icon: "shield" },
  { key: "unanswered", label: "Not answered", icon: "alert" },
  { key: "answered", label: "Answered", icon: "check" },
  { key: "test", label: "Tests", icon: "spark" },
] as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "all";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const take = 25;

  const where: any = { shop };
  if (filter === "test") where.isTest = true;
  else {
    where.isTest = false;
    if (filter !== "all") where.status = filter;
  }

  const [rows, total, grouped, tests] = await Promise.all([
    prisma.conversation.findMany({ where, orderBy: { lastMessageAt: "desc" }, take, skip: (page - 1) * take }),
    prisma.conversation.count({ where }),
    prisma.conversation.groupBy({ by: ["status"], where: { shop, isTest: false }, _count: { _all: true } }),
    prisma.conversation.count({ where: { shop, isTest: true } }),
  ]);
  const counts: Record<string, number> = { test: tests, all: 0 };
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    counts.all += g._count._all;
  }

  return {
    rows: rows.map((r) => ({ id: r.id, q: r.firstQuestion, status: r.status, n: r.messageCount, isTest: r.isTest, at: r.lastMessageAt.toISOString(), page: r.pageUrl })),
    total,
    counts,
    page,
    pages: Math.max(1, Math.ceil(total / take)),
  };
};

export default function ConversationsPage() {
  const d = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const filter = (params.get("filter") || "all") as (typeof FILTERS)[number]["key"];

  const go = (key: string, value: string | null) => {
    const p = new URLSearchParams(params);
    if (value === null) p.delete(key);
    else p.set(key, value);
    if (key !== "page") p.delete("page");
    setParams(p);
  };

  return (
    <s-page heading="Conversations" inlineSize="large">
      <PageLayout title="Conversations" description="Every chat from your store: what was asked, what was answered, and what was blocked.">
        <Card flush>
          <div style={{ padding: "16px 20px 12px" }}>
            <Tabs
              value={filter}
              onChange={(v) => go("filter", v === "all" ? null : v)}
              options={FILTERS.map((f) => ({ value: f.key, label: f.label, icon: f.icon, count: d.counts[f.key] || 0 }))}
            />
          </div>
          {d.rows.length === 0 ? (
            <div className="ap-empty">
              <strong>No conversations here yet</strong>
              <span className="ap-muted">
                {filter === "test" ? "Chats from the dashboard's test boxes show up here." : "Chats from your store show up here as soon as customers use the assistant."}
              </span>
            </div>
          ) : (
            <div className="ap-rows">
              {d.rows.map((r) => (
                <button key={r.id} type="button" className="ap-row" onClick={() => navigate(`/app/conversations/${r.id}`)}>
                  <div className="ap-row__main">
                    <span className="ap-row__title">{r.q || "(no question)"}</span>
                    <span className="ap-row__sub">
                      {Math.ceil(r.n / 2)} question{Math.ceil(r.n / 2) === 1 ? "" : "s"}
                      {r.page ? ` on ${r.page}` : ""}
                    </span>
                  </div>
                  {r.isTest && <span className="ap-tag ap-tag--plain">Test</span>}
                  <span className={`ap-tag ap-tag--${r.status}`}>{STATUS_TEXT[r.status] || r.status}</span>
                  <span className="ap-row__meta" style={{ width: 140, textAlign: "right" }}>
                    {new Date(r.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </button>
              ))}
            </div>
          )}
          {d.pages > 1 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", padding: "12px 20px", borderTop: "1px solid var(--ap-line-2)" }}>
              <span className="ap-faint">
                Page {d.page} of {d.pages}
              </span>
              <button type="button" className="ap-btn ap-btn--secondary ap-btn--sm" disabled={d.page <= 1} onClick={() => go("page", String(d.page - 1))}>
                Previous
              </button>
              <button type="button" className="ap-btn ap-btn--secondary ap-btn--sm" disabled={d.page >= d.pages} onClick={() => go("page", String(d.page + 1))}>
                Next
              </button>
            </div>
          )}
        </Card>
      </PageLayout>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
