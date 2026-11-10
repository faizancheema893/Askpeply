import prisma from "../db.server";
import {
  mergeGuardrails,
  mergeSettings,
  type BotSettings,
  type Guardrails,
} from "./defaults";

export type AdminApi = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

export async function getShopData(shop: string) {
  const row = await prisma.shopSettings.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
  let settings: unknown = {};
  let guardrails: unknown = {};
  try { settings = JSON.parse(row.settings); } catch { /* keep defaults */ }
  try { guardrails = JSON.parse(row.guardrails); } catch { /* keep defaults */ }
  return {
    row,
    plan: row.plan,
    settings: mergeSettings(settings),
    guardrails: mergeGuardrails(guardrails),
  };
}

export async function saveSettings(shop: string, settings: BotSettings) {
  await prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, settings: JSON.stringify(settings), settingsSavedAt: new Date() },
    update: { settings: JSON.stringify(settings), settingsSavedAt: new Date() },
  });
}

export async function saveGuardrails(shop: string, guardrails: Guardrails) {
  await prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, guardrails: JSON.stringify(guardrails), guardrailsSavedAt: new Date() },
    update: { guardrails: JSON.stringify(guardrails), guardrailsSavedAt: new Date() },
  });
}

export async function savePlan(shop: string, plan: string) {
  await prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, plan },
    update: { plan },
  });
}

/**
 * Copies the bot's look-and-feel settings to an app-data metafield, so the
 * theme app extension (the ask bar) can read them in Liquid without calling
 * our server: {{ app.metafields.askpeply.config.value }}
 */
export async function pushToStorefront(admin: AdminApi, settings: BotSettings) {
  const idRes = await admin.graphql(`#graphql
    query askpeplyAppInstallation { currentAppInstallation { id } }`);
  const idJson = (await idRes.json()) as any;
  const ownerId = idJson?.data?.currentAppInstallation?.id;
  if (!ownerId) return { ok: false, error: "No app installation id" };

  const res = await admin.graphql(
    `#graphql
    mutation askpeplySetConfig($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId,
            namespace: "askpeply",
            key: "config",
            type: "json",
            value: JSON.stringify(settings),
          },
        ],
      },
    },
  );
  const json = (await res.json()) as any;
  const errors = json?.data?.metafieldsSet?.userErrors || [];
  return errors.length ? { ok: false, error: errors[0].message } : { ok: true };
}

export function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function usageThisMonth(shop: string) {
  return prisma.conversation.count({
    where: { shop, isTest: false, startedAt: { gte: monthStart() } },
  });
}
