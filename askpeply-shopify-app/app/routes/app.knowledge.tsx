import { useEffect, useRef, useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useNavigate, useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { syncKnowledge } from "../lib/knowledge.server";
import { getShopData, saveSettings } from "../lib/settings.server";
import { extractPdfText } from "../lib/ai.server";
import { PLANS, planAllows, type PlanKey } from "../lib/defaults";
import { Card, Icon, PageLayout, Tabs, TextArea, TextInput } from "../components/ui";

const SOURCES = [
  { key: "all", label: "All", one: "Item", icon: "grid" },
  { key: "product", label: "Products", one: "Product", icon: "box" },
  { key: "page", label: "Pages", one: "Page", icon: "page" },
  { key: "policy", label: "Policies", one: "Policy", icon: "scale" },
  { key: "custom", label: "Your Q&A", one: "Q&A", icon: "qa" },
  { key: "document", label: "Documents", one: "Document", icon: "doc" },
] as const;

const MAX_FILE = 8 * 1024 * 1024;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const source = url.searchParams.get("source") || "all";

  const [groups, items, row] = await Promise.all([
    prisma.knowledgeItem.groupBy({ by: ["source"], where: { shop }, _count: { _all: true } }),
    prisma.knowledgeItem.findMany({
      where: { shop, ...(source !== "all" ? { source } : {}) },
      orderBy: [{ source: "asc" }, { title: "asc" }],
      take: 300,
    }),
    prisma.shopSettings.findUnique({ where: { shop } }),
  ]);
  const counts: Record<string, number> = {};
  for (const g of groups) counts[g.source] = g._count._all;
  const plan = (row?.plan && row.plan in PLANS ? row.plan : "free") as PlanKey;
  return {
    counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    items: items.map((i) => ({ id: i.id, source: i.source, title: i.title, url: i.url, content: i.content.replace(/^Description:\s*/, "").slice(0, 200), price: i.source === "product" ? (i.content.match(/\$\d[\d,.]*/) || [])[0] || null : null })),
    lastSyncAt: row?.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    canUpload: planAllows(plan, "documents"),
    planName: PLANS[plan].name,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Document upload (multipart)
  if ((request.headers.get("content-type") || "").includes("multipart/form-data")) {
    const { plan } = await getShopData(shop);
    if (!planAllows(plan, "documents")) return { ok: false, message: "Document upload is part of the Pro plan" };
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return { ok: false, message: "Choose a file first" };
    if (file.size > MAX_FILE) return { ok: false, message: "That file is over 8 MB" };
    const name = file.name || "Document";
    const lower = name.toLowerCase();
    let text = "";
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const r = await extractPdfText(base64);
      if (!r.ok) return { ok: false, message: `Couldn't read the PDF: ${r.error}` };
      text = r.text;
    } else if (/\.(txt|md|csv|json)$/.test(lower) || file.type.startsWith("text/")) {
      text = await file.text();
    } else {
      return { ok: false, message: "Upload a PDF, TXT, MD or CSV file" };
    }
    text = text.trim().slice(0, 60000);
    if (!text) return { ok: false, message: "No text found in that file" };
    await prisma.knowledgeItem.create({
      data: { shop, source: "document", sourceId: `doc-${Date.now()}`, title: name.slice(0, 200), content: text },
    });
    return { ok: true, message: `Added “${name}”` };
  }

  const f = (await request.json()) as Record<string, string>;

  if (f.intent === "sync") {
    try {
      const r = await syncKnowledge(admin, shop);
      if (r.shopName || r.email) {
        const { settings } = await getShopData(shop);
        await saveSettings(shop, { ...settings, storeName: r.shopName || settings.storeName, storeEmail: r.email || settings.storeEmail });
      }
      return { ok: true, message: `Synced ${r.products} products, ${r.pages} pages and ${r.policies} policies` };
    } catch (e: any) {
      return { ok: false, message: `Sync failed: ${String(e?.message || e).slice(0, 160)}` };
    }
  }

  if (f.intent === "add") {
    const question = (f.question || "").trim();
    const answer = (f.answer || "").trim();
    if (!question || !answer) return { ok: false, message: "Write both a question and an answer" };
    await prisma.knowledgeItem.create({
      data: { shop, source: "custom", sourceId: `custom-${Date.now()}`, title: question.slice(0, 300), content: answer.slice(0, 6000) },
    });
    return { ok: true, message: "Q&A added", added: true };
  }

  if (f.intent === "delete" && f.id) {
    await prisma.knowledgeItem.deleteMany({ where: { id: f.id, shop, source: { in: ["custom", "document"] } } });
    return { ok: true, message: "Removed" };
  }

  return { ok: false, message: "Unknown action" };
};

export default function KnowledgePage() {
  const d = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const upload = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const source = (params.get("source") || "all") as (typeof SOURCES)[number]["key"];
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [a, setA] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const syncing = fetcher.state !== "idle" && (fetcher.json as any)?.intent === "sync";
  const uploading = upload.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message, { isError: !fetcher.data.ok });
      if ((fetcher.data as any).added) {
        setQ("");
        setA("");
      }
    }
  }, [fetcher.state, fetcher.data, shopify]);

  useEffect(() => {
    if (upload.state === "idle" && upload.data?.message) {
      shopify.toast.show(upload.data.message, { isError: !upload.data.ok });
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [upload.state, upload.data, shopify]);

  const post = (data: Record<string, string>) => fetcher.submit(data as any, { method: "post", encType: "application/json" });

  const onFile = (file?: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    upload.submit(fd, { method: "post", encType: "multipart/form-data" });
  };

  return (
    <s-page heading="Knowledge" inlineSize="large">
      <s-button slot="primary-action" variant="primary" onClick={() => post({ intent: "sync" })} {...(syncing ? { loading: true } : {})}>
        Sync store
      </s-button>

      <PageLayout
        title="Knowledge"
        description="Everything the assistant is allowed to answer from. It never uses anything outside this list."
        aside={
          <>
            <Card title="Add a question and answer" description="For things that aren't on your website: lab partners, batch testing, wholesale terms.">
              <TextInput label="Question" value={q} placeholder="Do you offer wholesale pricing?" onChange={(e) => setQ(e.target.value)} />
              <TextArea label="Answer" rows={4} value={a} placeholder="Yes, for orders of 20 vials or more. Email wholesale@yourstore.com." onChange={(e) => setA(e.target.value)} />
              <div>
                <button
                  type="button"
                  className="ap-btn ap-btn--primary"
                  disabled={!q.trim() || !a.trim()}
                  onClick={() => post({ intent: "add", question: q, answer: a })}
                >
                  Add to knowledge
                </button>
              </div>
            </Card>

            <Card title="Upload documents" description="COAs, lab reports, FAQs or price lists. The assistant reads the text and answers from it.">
              {d.canUpload ? (
                <>
                  <label className="ap-drop">
                    <Icon name="upload" size={20} />
                    <strong style={{ fontSize: 13.5 }}>{uploading ? "Reading your file…" : "Choose a file"}</strong>
                    <span className="ap-faint">PDF, TXT, MD or CSV, up to 8 MB</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.txt,.md,.csv,application/pdf,text/plain"
                      style={{ display: "none" }}
                      disabled={uploading}
                      onChange={(e) => onFile(e.target.files?.[0])}
                    />
                  </label>
                </>
              ) : (
                <div className="ap-lock">
                  <Icon name="lock" size={18} />
                  <div>
                    Document upload is part of the Pro plan. You're on {d.planName}.{" "}
                    <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => navigate("/app/plans")}>
                      See plans
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </>
        }
      >
        <Card
          title="What your assistant knows"
          description={
            d.lastSyncAt
              ? `Last synced ${new Date(d.lastSyncAt).toLocaleString()}. Sync again after you change products, pages or policies.`
              : "Not synced yet. Press Sync store to import your products, pages and policies."
          }
          flush
        >
          <div style={{ padding: "6px 20px 14px", display: "grid", gap: 12 }}>
            <Tabs
              value={source}
              onChange={(v) => {
                const p = new URLSearchParams(params);
                if (v === "all") p.delete("source");
                else p.set("source", v);
                setParams(p);
              }}
              options={SOURCES.map((s) => ({ value: s.key, label: s.label, icon: s.icon, count: s.key === "all" ? d.total : d.counts[s.key] || 0 }))}
            />
            {d.items.length > 6 && (
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: 12, color: "var(--ap-text-3)" }}>
                  <Icon name="search" size={16} />
                </span>
                <input
                  className="ap-input"
                  style={{ paddingLeft: 36 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products, pages and answers"
                />
              </div>
            )}
          </div>
          {(() => {
            const term = search.trim().toLowerCase();
            const list = term ? d.items.filter((i) => (i.title + " " + i.content).toLowerCase().includes(term)) : d.items;
            if (!list.length) {
              return (
                <div className="ap-empty">
                  <strong>{d.total === 0 ? "Nothing here yet" : term ? "No matches" : "Nothing in this group"}</strong>
                  <span className="ap-muted">
                    {d.total === 0 ? "Press Sync store to give the assistant something to answer from." : term ? "Try a different word." : "Pick another group above."}
                  </span>
                  {d.total === 0 && (
                    <button type="button" className="ap-btn ap-btn--primary" style={{ marginTop: 8 }} onClick={() => post({ intent: "sync" })}>
                      Sync store
                    </button>
                  )}
                </div>
              );
            }
            return (
              <div className="ap-rows">
                {list.map((it) => {
                  const src = SOURCES.find((s) => s.key === it.source);
                  const price = it.price;
                  const removable = it.source === "custom" || it.source === "document";
                  return (
                    <div key={it.id} className="ap-row ap-row--hover">
                      <span className={`ap-tile ap-tile--${it.source}`}>
                        <Icon name={src?.icon || "doc"} size={17} />
                      </span>
                      <div className="ap-row__main">
                        <span className="ap-row__title">{it.title}</span>
                        <span className="ap-row__sub">{it.content}</span>
                      </div>
                      {price && <span className="ap-price">{price}</span>}
                      <span className="ap-tag ap-tag--plain">{src?.one || it.source}</span>
                      {removable && (
                        <button type="button" className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => post({ intent: "delete", id: it.id })} aria-label={`Remove ${it.title}`}>
                          <Icon name="trash" size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>
      </PageLayout>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
