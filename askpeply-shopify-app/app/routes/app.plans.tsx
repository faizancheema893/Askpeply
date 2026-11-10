import { useEffect } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getShopData, savePlan, usageThisMonth } from "../lib/settings.server";
import { PLANS, type PlanKey } from "../lib/defaults";
import { Card, Icon, PageLayout } from "../components/ui";

// Demo phase: the plan is stored in our database without charging.
// Before the App Store launch this switches to Shopify Billing.

const FOR: Record<PlanKey, string> = {
  starter: "For new and smaller peptide stores getting their first questions answered.",
  growth: "For stores that want full protection and their team in the loop.",
  pro: "For high-volume stores with their own documents and research data.",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { plan } = await getShopData(session.shop);
  return { plan, used: await usageThisMonth(session.shop) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const f = await request.formData();
  const plan = String(f.get("plan") || "");
  if (!(plan in PLANS)) return { ok: false };
  await savePlan(session.shop, plan);
  return { ok: true, plan };
};

export default function PlansPage() {
  const { plan, used } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const pending = fetcher.state !== "idle" ? String(fetcher.formData?.get("plan") || "") : "";
  const current = (pending || plan) as PlanKey;
  const limit = PLANS[current in PLANS ? current : "starter"].conversations;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show(`You're on ${PLANS[fetcher.data.plan as PlanKey].name}`);
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
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
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
                  {isCurrent ? "Your plan" : `Switch to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="ap-faint" style={{ textAlign: "center", margin: "4px 0 0" }}>
          Demo mode: switching plans is instant and nothing is charged. Billing through Shopify starts when the app is
          published on the App Store.
        </p>
      </PageLayout>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
