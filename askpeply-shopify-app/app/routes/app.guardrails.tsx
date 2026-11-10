import { useEffect, useRef } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getShopData, saveGuardrails } from "../lib/settings.server";
import { DEFAULT_GUARDRAILS, PLANS, planAllows, type Guardrails, type PlanKey } from "../lib/defaults";
import { bool, collectFields } from "../lib/form";
import { TestChat } from "../components/TestChat";
import { Card, Icon, PageLayout, Select, TextArea, TextInput, Toggle } from "../components/ui";
import { useNavigate } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { guardrails, plan } = await getShopData(session.shop);
  const planKey = (plan in PLANS ? plan : "starter") as PlanKey;
  return {
    g: guardrails,
    planName: PLANS[planKey].name,
    customTopics: planAllows(planKey, "customTopics"),
    escalation: planAllows(planKey, "escalation"),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const f = (await request.json()) as Record<string, string>;
  const next: Guardrails = {
    blockDosing: f.blockDosing === "on",
    blockHumanUse: f.blockHumanUse === "on",
    blockMedical: f.blockMedical === "on",
    blockOffLabel: f.blockOffLabel === "on",
    blockedTopics: f.blockedTopics || "",
    refusalMessage: (f.refusalMessage || "").trim() || DEFAULT_GUARDRAILS.refusalMessage,
    disclaimer: f.disclaimer || "",
    appendDisclaimer: f.appendDisclaimer === "on",
    tone: (["professional", "friendly", "concise"].includes(f.tone) ? f.tone : "professional") as Guardrails["tone"],
    customInstructions: f.customInstructions || "",
    supportEmail: (f.supportEmail || "").trim(),
    escalateBlocked: f.escalateBlocked === "on",
    retentionDays: [30, 90, 180, 365].includes(Number(f.retentionDays)) ? Number(f.retentionDays) : 90,
  };
  await saveGuardrails(session.shop, next);
  return { ok: true };
};

export default function GuardrailsPage() {
  const { g, planName, customTopics, escalation } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const saving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) shopify.toast.show("Guardrails saved");
  }, [fetcher.state, fetcher.data, shopify]);

  const save = () => fetcher.submit(collectFields(formRef.current) as any, { method: "post", encType: "application/json" });

  return (
    <s-page heading="Guardrails" inlineSize="large">
      <s-button slot="primary-action" variant="primary" onClick={save} {...bool(saving, "loading")}>
        Save guardrails
      </s-button>

      <PageLayout
        title="Guardrails"
        description="What the assistant must never answer, and how it sounds when it does."
        aside={
          <TestChat
            title="Test the guardrails"
            description="Save first, then try the red questions. They should be blocked; the normal one should be answered."
            suggestions={["How should I store it?"]}
            risky={["What dose should I take?", "Can I inject this daily?", "Does it help with weight loss?"]}
          />
        }
      >
        <div ref={formRef} style={{ display: "grid", gap: 16 }}>
          <Card title="Always blocked" description="These questions are stopped before they reach the AI, so the assistant can never answer them.">
            <div>
              <Toggle label="Dosing" help="How much, how often, mg per day, cycle length" name="blockDosing" defaultChecked={g.blockDosing} />
              <Toggle label="Human use and administration" help="Injecting, taking it orally, “can I use this”" name="blockHumanUse" defaultChecked={g.blockHumanUse} />
              <Toggle label="Medical claims" help="Treating or curing conditions, side effects, weight loss, anti-aging" name="blockMedical" defaultChecked={g.blockMedical} />
              <Toggle label="Off-label use" help="Stacks, bodybuilding, performance enhancement" name="blockOffLabel" defaultChecked={g.blockOffLabel} />
            </div>
            <TextArea label="Reply when a question is blocked" name="refusalMessage" rows={3} defaultValue={g.refusalMessage} />
          </Card>

          <Card title="Your own blocked topics" description="Any question containing these words gets the blocked reply.">
            {!customTopics && (
              <div className="ap-lock">
                <Icon name="lock" size={18} />
                <div>
                  Custom blocked topics are part of the Growth and Pro plans. You're on {planName}.{" "}
                  <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => navigate("/app/plans")}>
                    See plans
                  </button>
                </div>
              </div>
            )}
            <TextArea
              label="Words or topics to block"
              help="One per line."
              name="blockedTopics"
              rows={4}
              defaultValue={g.blockedTopics}
              placeholder={"competitor names\ndiscount codes"}
              disabled={!customTopics}
            />
          </Card>

          <Card title="Voice and disclaimer">
            <div className="ap-grid2">
              <Select
                label="Tone"
                name="tone"
                defaultValue={g.tone}
                options={[
                  { value: "professional", label: "Professional" },
                  { value: "friendly", label: "Friendly" },
                  { value: "concise", label: "Concise" },
                ]}
              />
              <TextInput label="Research-use disclaimer" name="disclaimer" defaultValue={g.disclaimer} />
            </div>
            <div>
              <Toggle label="Add the disclaimer under every AI answer" name="appendDisclaimer" defaultChecked={g.appendDisclaimer} />
            </div>
            <TextArea
              label="Extra instructions for the assistant"
              help="Optional. For example: always mention that orders over $200 ship free."
              name="customInstructions"
              rows={3}
              defaultValue={g.customInstructions}
            />
          </Card>

          <Card title="Privacy" description="How long chats are kept. Customer emails are always hidden in saved chats (j***@gmail.com).">
            <Select
              label="Delete conversations after"
              name="retentionDays"
              defaultValue={String(g.retentionDays || 90)}
              options={[
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days (recommended)" },
                { value: "180", label: "180 days" },
                { value: "365", label: "1 year" },
              ]}
            />
          </Card>

          <Card title="When the assistant can't help" description="What customers see, and what your team gets flagged.">
            <TextInput
              label="Support email shown to customers"
              type="email"
              name="supportEmail"
              defaultValue={g.supportEmail}
              placeholder="support@yourstore.com"
              help="Used when the assistant doesn't know an answer."
            />
            <div>
              <Toggle
                label="Flag blocked and unanswered chats for your team"
                help={escalation ? "They appear under Conversations → Needs your team." : "Smart escalation is part of the Growth and Pro plans."}
                name="escalateBlocked"
                defaultChecked={g.escalateBlocked}
                disabled={!escalation}
              />
            </div>
          </Card>
        </div>
      </PageLayout>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
