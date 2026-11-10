import prisma from "../db.server";
import type { AdminApi } from "./settings.server";

export function stripHtml(html: string | null | undefined) {
  return String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n")
    .trim();
}

type Item = { source: string; sourceId: string; title: string; content: string; url: string | null };

async function gql(admin: AdminApi, query: string, variables?: Record<string, unknown>) {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  const json = (await res.json()) as any;
  if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 300));
  return json.data;
}

async function fetchProducts(admin: AdminApi): Promise<Item[]> {
  const items: Item[] = [];
  let after: string | null = null;
  for (let page = 0; page < 10; page++) {
    const data: any = await gql(
      admin,
      `#graphql
      query askpeplyProducts($after: String) {
        products(first: 100, after: $after, query: "status:active") {
          pageInfo { hasNextPage endCursor }
          nodes {
            id title handle productType vendor tags description
            variants(first: 20) { nodes { title price sku availableForSale } }
          }
        }
      }`,
      { after },
    );
    for (const p of data.products.nodes) {
      const variants = (p.variants?.nodes || [])
        .map((v: any) => `${v.title === "Default Title" ? "Standard" : v.title}: $${v.price}${v.sku ? ` (SKU ${v.sku})` : ""}${v.availableForSale ? "" : " — out of stock"}`)
        .join("; ");
      const content = [
        p.description ? `Description: ${p.description}` : "",
        p.productType ? `Type: ${p.productType}` : "",
        p.vendor ? `Vendor: ${p.vendor}` : "",
        p.tags?.length ? `Tags: ${p.tags.join(", ")}` : "",
        variants ? `Sizes and prices: ${variants}` : "",
      ].filter(Boolean).join("\n");
      items.push({ source: "product", sourceId: p.id, title: p.title, content, url: `/products/${p.handle}` });
    }
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }
  return items;
}

async function fetchPages(admin: AdminApi): Promise<Item[]> {
  try {
    const data: any = await gql(
      admin,
      `#graphql
      query askpeplyPages {
        pages(first: 100) { nodes { id title handle body isPublished } }
      }`,
    );
    return data.pages.nodes
      .filter((p: any) => p.isPublished !== false)
      .map((p: any) => ({
        source: "page",
        sourceId: p.id,
        title: p.title,
        content: stripHtml(p.body).slice(0, 6000),
        url: `/pages/${p.handle}`,
      }));
  } catch (e) {
    console.error("[askpeply] pages sync skipped:", String(e));
    return [];
  }
}

async function fetchPolicies(admin: AdminApi): Promise<{ items: Item[]; shopName: string; email: string }> {
  try {
    const data: any = await gql(
      admin,
      `#graphql
      query askpeplyShop {
        shop {
          name email
          shopPolicies { id type title body url }
        }
      }`,
    );
    const items = (data.shop.shopPolicies || [])
      .filter((p: any) => stripHtml(p.body))
      .map((p: any) => ({
        source: "policy",
        sourceId: p.id,
        title: p.title,
        content: stripHtml(p.body).slice(0, 8000),
        url: p.url ? new URL(p.url).pathname : null,
      }));
    return { items, shopName: data.shop.name, email: data.shop.email };
  } catch (e) {
    console.error("[askpeply] policies sync skipped:", String(e));
    return { items: [], shopName: "", email: "" };
  }
}

export async function syncKnowledge(admin: AdminApi, shop: string) {
  const [products, pages, policies] = await Promise.all([
    fetchProducts(admin),
    fetchPages(admin),
    fetchPolicies(admin),
  ]);
  const all = [...products, ...pages, ...policies.items];

  for (const it of all) {
    await prisma.knowledgeItem.upsert({
      where: { shop_source_sourceId: { shop, source: it.source, sourceId: it.sourceId } },
      create: { shop, ...it },
      update: { title: it.title, content: it.content, url: it.url },
    });
  }

  // Remove synced items that no longer exist in the store (custom Q&A stays).
  for (const source of ["product", "page", "policy"]) {
    const keep = all.filter((i) => i.source === source).map((i) => i.sourceId);
    await prisma.knowledgeItem.deleteMany({
      where: { shop, source, sourceId: { notIn: keep.length ? keep : ["__none__"] } },
    });
  }

  await prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, lastSyncAt: new Date() },
    update: { lastSyncAt: new Date() },
  });

  return {
    products: products.length,
    pages: pages.length,
    policies: policies.items.length,
    shopName: policies.shopName,
    email: policies.email,
  };
}

const STOP = new Set(
  "a an and are as at be but by can do does for from have how i if in is it its me my of on or our please so that the this to was what when where which who why will with you your yours tell about any there their them they we us".split(" "),
);

function terms(text: string) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9À-ɏ؀-ۿ -]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Simple keyword search: good enough for a store catalog and policies. */
export async function searchKnowledge(shop: string, question: string, limit = 6) {
  const items = await prisma.knowledgeItem.findMany({ where: { shop } });
  const q = Array.from(new Set(terms(question)));
  if (!q.length) return items.filter((i) => i.source === "policy" || i.source === "custom").slice(0, limit);

  const scored = items.map((it) => {
    const title = it.title.toLowerCase();
    const body = it.content.toLowerCase();
    let score = 0;
    for (const t of q) {
      if (title.includes(t)) score += 4;
      const hits = body.split(t).length - 1;
      score += Math.min(hits, 5);
    }
    if (it.source === "custom") score *= 1.5;
    return { it, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.it);
}
