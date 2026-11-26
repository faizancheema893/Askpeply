import { useEffect } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  authenticate,
  MONTHLY_PLAN_STARTER,
  MONTHLY_PLAN_GROWTH,
  MONTHLY_PLAN_PRO,
} from "../shopify.server";
import { getShopData, savePlan, usageThisMonth } from "../lib/settings.server";
import { PLANS, type PlanKey } from "../lib/defaults";
import { Card, Icon, PageLayout } from "../components/ui";

const FOR: Record<PlanKey, string> = {
  free: "Free starter trial for all new stores. Includes 20 AI chats.",
  starter: "For new and boutique online stores getting started with AI sales assistance.",
  growth: "For growing e-commerce stores wanting automated order tracking and brand protection.",
  pro: "For high-volume brands, established retailers, and research stores with custom docs.",
};

const PAID_PLANS: PlanKey[] = ["starter", "growth", "pro"];

const PLAN_NAME_TO_KEY: Record<string, PlanKey> = {
  [MONTHLY_PLAN_STARTER]: "starter",
  [MONTHLY_PLAN_GROWTH]: "growth",
  [MONTHLY_PLAN_PRO]: "pro",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const { plan: storedPlan } = await getShopData(session.shop);
  let activePlan: PlanKey = (storedPlan in PLANS ? storedPlan : "free") as PlanKey;

  try {
    const isTest = process.env.NODE_ENV !== "production" || process.env.SHOPIFY_BILLING_TEST === "true";
    const checkResult = await billing.check({
      plans: [MONTHLY_PLAN_STARTER, MONTHLY_PLAN_GROWTH, MONTHLY_PLAN_PRO],
      isTest,
    });

    if (checkResult.hasActivePayment && checkResult.appSubscriptions && checkResult.appSubscriptions.length > 0) {
      const activeSub = checkResult.appSubscriptions[0];
      const matchedKey = PLAN_NAME_TO_KEY[activeSub.name];
      if (matchedKey && matchedKey !== activePlan) {
        activePlan = matchedKey;
        await savePlan(session.shop, activePlan);
      }
    }
  } catch (err) {
    console.warn("[askpeply] billing check warning:", err);
  }

  return { plan: activePlan, used: await usageThisMonth(session.shop) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const f = await request.formData();
  const planKey = String(f.get("plan") || "").toLowerCase();

  const keyToName: Record<string, string> = {
    starter: MONTHLY_PLAN_STARTER,
    growth: MONTHLY_PLAN_GROWTH,
    pro: MONTHLY_PLAN_PRO,
  };

  const planName = keyToName[planKey];
  if (!planName) {
    return { ok: false, error: "invalid_plan" };
  }

  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const returnUrl = `${appUrl}/app/plans`;
  const isTest = process.env.NODE_ENV !== "production" || process.env.SHOPIFY_BILLING_TEST === "true";

  return await billing.request({
    plan: planName as any,
    isTest,
    returnUrl,
  });
};

export default function PlansPage() {
  const { plan, used } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const pending = fetcher.state !== "idle" ? String(fetcher.formData?.get("plan") || "") : "";
  const current = (pending || plan) as PlanKey;
  const limit = PLANS[current in PLANS ? current : "free"].conversations;
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && (fetcher.data as any).plan) {
      shopify.toast.show(`You're on ${PLANS[(fetcher.data as any).plan as PlanKey].name}`);
    }
  }, [fetcher.state, fetcher.data, shopify]);

  return (
    <s-page heading="Plans" inlineSize="large">
      <PageLayout title="Plans" description="Pick the plan that fits your store. You can change it any time.">
        <Card>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 650 }}>You're on {PLANS[current].name}</span>
              <span className="ap-muted">
                {used.toLocaleString()} of {limit.toLocaleString()} conversations used this month. Test chats don't count.
              </span>
            </div>
            <div style={{ width: 240 }} className="ap-meter">
              <span style={{ width: `${Math.max(1.5, pct)}%` }} />
            </div>
          </div>
        </Card>

        <div className="ap-plans">
          {PAID_PLANS.map((key) => {
            const p = PLANS[key];
            const isCurrent = current === key;
            const featured = key === "growth";
            return (
              <div key={key} className={`ap-plan ${featured ? "ap-plan--featured" : ""} ${isCurrent && !featured ? "ap-plan--current" : ""}`}>
                <div className="ap-plan__name">
                  <span>{p.name}</span>
                  {isCurrent ? (
                    <span className="ap-tag ap-tag--good">Current plan</span>
                  ) : featured ? (
                    <span className="ap-tag ap-tag--brand ap-tag--plain">Most chosen</span>
                  ) : null}
                </div>
                <div className="ap-plan__price">
                  <b>${p.price}</b>
                  <span>USD per month</span>
                </div>
                <p className="ap-plan__for">{FOR[key]}</p>
                <div className="ap-plan__volume">
                  <b>{p.conversations.toLocaleString()}</b> conversations a month
                </div>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}>
                      <Icon name="check" stroke={2.4} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`ap-btn ${featured ? "ap-btn--pearl" : isCurrent ? "ap-btn--secondary" : "ap-btn--primary"}`}
                  disabled={isCurrent || fetcher.state !== "idle"}
                  onClick={() => fetcher.submit({ plan: key }, { method: "post" })}
                >
                  {isCurrent ? "Current plan" : `Switch to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="ap-faint" style={{ textAlign: "center", margin: "4px 0 0" }}>
          Subscriptions are billed monthly through your official Shopify store invoice. You can upgrade, downgrade, or cancel anytime.
        </p>
      </PageLayout>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
