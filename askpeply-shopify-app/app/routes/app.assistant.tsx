import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getShopData, pushToStorefront, saveSettings } from "../lib/settings.server";
import { COLOR_FIELDS, DEFAULT_SETTINGS, THEMES, planAllows, type BotSettings } from "../lib/defaults";
import { bool, collectFields } from "../lib/form";
import { Card, Icon, PageLayout, Segmented, Select, TextArea, TextInput, Toggle } from "../components/ui";
import { BotPreview, type PreviewState } from "../components/BotPreview";

const SLOTS = [0, 1, 2, 3];
const isHex = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim());

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { settings, plan } = await getShopData(session.shop);
  return { settings, canTrack: planAllows(plan, "orderTracking") };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const f = (await request.json()) as Record<string, string>;
  const { settings: current } = await getShopData(session.shop);
  const num = (v: string, d: number, min: number, max: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
  };

  const colors: Partial<BotSettings> = {};
  for (const c of COLOR_FIELDS) {
    (colors as any)[c.key] = isHex(f[c.key]) ? f[c.key].trim().toUpperCase() : (DEFAULT_SETTINGS as any)[c.key];
  }

  const next: BotSettings = {
    ...current,
    ...colors,
    botName: (f.botName || "").trim() || DEFAULT_SETTINGS.botName,
    placeholder: (f.placeholder || "").trim() || DEFAULT_SETTINGS.placeholder,
    typingLines: f.typingLines || "",
    note: f.note || "",
    position: (["right", "center", "left"].includes(f.position) ? f.position : "right") as BotSettings["position"],
    iconMode: (["all", "tablets", "phones", "off"].includes(f.iconMode) ? f.iconMode : "all") as BotSettings["iconMode"],
    sideOffset: num(f.sideOffset, 24, 8, 80),
    bottomOffset: num(f.bottomOffset, 20, 8, 80),
    showMic: f.showMic === "on",
    orderTracking: f.orderTracking === "on",
    suggested: SLOTS.map((i) => ({
      question: (f[`q${i}`] || "").trim(),
      answer: (f[`a${i}`] || "").trim(),
      keywords: (f[`k${i}`] || "").trim(),
    })).filter((s) => s.question),
    fallbackAnswer: f.fallbackAnswer || DEFAULT_SETTINGS.fallbackAnswer,
    offlineAnswer: f.offlineAnswer || DEFAULT_SETTINGS.offlineAnswer,
  };

  await saveSettings(session.shop, next);
  const pushed = await pushToStorefront(admin, next);
  return { ok: true, pushed };
};

function ColorRow({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="ap-color">
      <label className="ap-color__well" style={{ background: value }} title={`Change ${label.toLowerCase()}`}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={label} />
      </label>
      <div>
        <div className="ap-color__name">{label}</div>
        <div className="ap-color__help">{help}</div>
      </div>
      <input
        className="ap-color__hex"
        value={text}
        maxLength={7}
        onChange={(e) => {
          let v = e.target.value.trim();
          if (v && !v.startsWith("#")) v = "#" + v;
          setText(v);
          if (isHex(v)) onChange(v.toUpperCase());
        }}
        onBlur={() => setText(value)}
        aria-label={`${label} hex code`}
      />
    </div>
  );
}

export default function AssistantPage() {
  const { settings, canTrack } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const formRef = useRef<HTMLDivElement>(null);
  const saving = fetcher.state !== "idle";
  const [draft, setDraft] = useState<BotSettings>(settings);
  const [state, setState] = useState<PreviewState>("open");
  const [page, setPage] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show(
        fetcher.data.pushed?.ok ? "Published to your store" : `Saved, but the store update failed: ${fetcher.data.pushed?.error}`,
        { isError: !fetcher.data.pushed?.ok },
      );
    }
  }, [fetcher.state, fetcher.data, shopify]);

  // Live preview: re-read the form fields whenever one changes.
  const readForm = useCallback(() => {
    const f = collectFields(formRef.current);
    setDraft((d) => ({
      ...d,
      botName: f.botName || d.botName,
      placeholder: f.placeholder || d.placeholder,
      typingLines: f.typingLines ?? d.typingLines,
      note: f.note ?? d.note,
      position: (f.position || d.position) as BotSettings["position"],
      showMic: f.showMic === "on",
      sideOffset: parseInt(f.sideOffset, 10) || d.sideOffset,
      bottomOffset: parseInt(f.bottomOffset, 10) || d.bottomOffset,
      suggested: SLOTS.map((i) => ({ question: (f[`q${i}`] || "").trim(), answer: f[`a${i}`] || "", keywords: f[`k${i}`] || "" })).filter(
        (q) => q.question,
      ),
    }));
  }, []);

  useEffect(() => {
    const root = formRef.current;
    if (!root) return;
    const fields: HTMLElement[] = Array.from(root.querySelectorAll<HTMLElement>("[name]"));
    const handler = () => requestAnimationFrame(readForm);
    fields.forEach((el: HTMLElement) => {
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
    return () =>
      fields.forEach((el: HTMLElement) => {
        el.removeEventListener("input", handler);
        el.removeEventListener("change", handler);
      });
  }, [readForm]);

  const pickColors = (d: BotSettings) => Object.fromEntries(COLOR_FIELDS.map((c) => [c.key, String((d as any)[c.key])])) as Record<string, string>;
  const matchTheme = (d: BotSettings) =>
    THEMES.find((t) => Object.entries(t.colors).every(([k, v]) => String((d as any)[k]).toUpperCase() === String(v).toUpperCase()))?.key;
  // "Custom" remembers the merchant's own colors so they can switch to a preset and back.
  const [customColors, setCustomColors] = useState<Record<string, string> | null>(() => (matchTheme(settings) ? null : pickColors(settings)));
  const setColor = (key: string, v: string) =>
    setDraft((d) => {
      const next = { ...d, [key]: v };
      setCustomColors(pickColors(next));
      return next;
    });
  const applyTheme = (colors: Record<string, string | undefined>) => setDraft((d) => ({ ...d, ...(colors as any) }));
  const activeTheme = matchTheme(draft) || "custom";
  const customSwatch = customColors || pickColors(draft);

  const save = () => {
    const payload: Record<string, string> = { ...collectFields(formRef.current) };
    for (const c of COLOR_FIELDS) payload[c.key] = String((draft as any)[c.key]);
    fetcher.submit(payload as any, { method: "post", encType: "application/json" });
  };

  const groups = Array.from(new Set(COLOR_FIELDS.map((c) => c.group)));

  return (
    <s-page heading="Assistant" inlineSize="large">
      <s-button slot="primary-action" variant="primary" onClick={save} {...bool(saving, "loading")}>
        Save and publish
      </s-button>

      <PageLayout
        title="Assistant"
        description="How the assistant looks and what it says before the AI takes over."
        asideWidth={420}
        aside={
          <Card
            title="Live preview"
            description="Exactly what customers see. Changes appear as you edit; Save and publish sends them to your store."
          >
            <div className="ap-stage__bar">
              <Segmented
                value={state}
                onChange={setState}
                options={[
                  { value: "closed", label: "Closed" },
                  { value: "open", label: "Open" },
                  { value: "chat", label: "Chat" },
                ]}
              />
              <Segmented
                value={page}
                onChange={setPage}
                options={[
                  { value: "light", label: "Light store" },
                  { value: "dark", label: "Dark store" },
                ]}
              />
            </div>
            <BotPreview s={draft} state={state} page={page} />
          </Card>
        }
      >
        <Card
          title="Appearance"
          description="Start from a theme, then fine-tune any color. Every part of the bar can be changed."
          action={
            <button type="button" className="ap-btn ap-btn--secondary ap-btn--sm" onClick={() => applyTheme(THEMES[0].colors)}>
              Reset to default
            </button>
          }
        >
          <div className="ap-themes">
            {THEMES.map((t) => (
              <button key={t.key} type="button" className="ap-theme" aria-pressed={activeTheme === t.key} onClick={() => applyTheme(t.colors)}>
                <span className="ap-theme__swatch" style={{ background: t.colors.barBg }}>
                  <i style={{ background: t.colors.chipText }} />
                  <b
                    style={{
                      background: `linear-gradient(135deg, ${t.colors.accentViolet}, ${t.colors.accentFuchsia} 60%, ${t.colors.accentCyan})`,
                    }}
                  />
                </span>
                {t.name}
                {t.key === "nebula" ? " (default)" : ""}
              </button>
            ))}
            <button
              type="button"
              className="ap-theme"
              aria-pressed={activeTheme === "custom"}
              onClick={() => customColors && applyTheme(customColors)}
              title={customColors ? "Your own colors" : "Change any color below to create your own theme"}
            >
              <span className="ap-theme__swatch" style={{ background: customSwatch.barBg }}>
                <i style={{ background: customSwatch.chipText }} />
                <b style={{ background: `linear-gradient(135deg, ${customSwatch.accentViolet}, ${customSwatch.accentFuchsia} 60%, ${customSwatch.accentCyan})` }} />
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="palette" size={14} />
                Custom
              </span>
            </button>
          </div>
          <div className="ap-colors">
            {groups.map((g) => (
              <div key={g} className="ap-colors__group">
                <h4>{g}</h4>
                {COLOR_FIELDS.filter((c) => c.group === g).map((c) => (
                  <ColorRow
                    key={c.key}
                    label={c.label}
                    help={c.help}
                    value={String((draft as any)[c.key] || (DEFAULT_SETTINGS as any)[c.key])}
                    onChange={(v) => setColor(c.key as string, v)}
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>

        <div ref={formRef} style={{ display: "grid", gap: 16 }}>
          <Card title="Name and wording">
            <TextInput label="Assistant name" name="botName" defaultValue={settings.botName} help="Shown in the chat header and as the avatar letter." />
            <TextInput label="Input placeholder" name="placeholder" defaultValue={settings.placeholder} />
            <TextArea
              label="Example questions typed in the closed bar"
              name="typingLines"
              rows={5}
              defaultValue={settings.typingLines}
              help="One question per line. They type, pause, erase and rotate."
            />
            <TextInput label="Small note under the open bar" name="note" defaultValue={settings.note} />
            <div>
              <Toggle label="Microphone button" help="Lets customers speak their question (in browsers that support it)." name="showMic" defaultChecked={settings.showMic} />
            </div>
          </Card>

          <Card
            title="Order tracking"
            description="Customers can ask “Where is my order?”. The assistant asks for the order number and checkout email, and only answers when both match."
          >
            <div>
              <Toggle
                label="Answer order status questions"
                help={
                  canTrack
                    ? "Shows the status, courier, tracking number and a tracking link. Emails are never saved."
                    : "Order tracking is part of the Growth and Pro plans."
                }
                name="orderTracking"
                defaultChecked={settings.orderTracking !== false}
                disabled={!canTrack}
              />
            </div>
          </Card>

          <Card
            title="Suggested questions"
            description="Shown as buttons when the bar opens, up to 4. Leave the answer empty to let the AI answer from your store, or write a fixed answer."
          >
            {SLOTS.map((i) => {
              const q = settings.suggested[i] || { question: "", answer: "", keywords: "" };
              return (
                <div key={i} className="ap-qbox">
                  <span className="ap-qbox__num">Question {i + 1}</span>
                  <TextInput label="Question" name={`q${i}`} defaultValue={q.question} placeholder="e.g. How long does shipping take?" />
                  <TextArea label="Written answer (optional)" name={`a${i}`} rows={2} defaultValue={q.answer} placeholder="Leave empty to let the AI answer" />
                  <TextInput
                    label="Backup keywords"
                    name={`k${i}`}
                    defaultValue={q.keywords}
                    placeholder="shipping, delivery, arrive"
                    help="If the AI can't be reached, typed questions with these words get the written answer."
                  />
                </div>
              );
            })}
          </Card>

          <Card title="Position">
            <div className="ap-grid2">
              <Select
                label="Position on desktop and tablet"
                name="position"
                defaultValue={settings.position}
                options={[
                  { value: "right", label: "Bottom right" },
                  { value: "center", label: "Bottom center" },
                  { value: "left", label: "Bottom left" },
                ]}
              />
              <Select
                label="Turn into a round icon after scrolling"
                name="iconMode"
                defaultValue={settings.iconMode}
                options={[
                  { value: "all", label: "On all screens" },
                  { value: "tablets", label: "Phones and tablets" },
                  { value: "phones", label: "Phones only" },
                  { value: "off", label: "Never" },
                ]}
              />
              <TextInput label="Distance from the side (px)" name="sideOffset" type="number" min={8} max={80} defaultValue={settings.sideOffset} />
              <TextInput label="Distance from the bottom (px)" name="bottomOffset" type="number" min={8} max={80} defaultValue={settings.bottomOffset} />
            </div>
          </Card>

          <Card title="Backup answers" description="Used only when the AI can't give an answer.">
            <TextArea label="When nothing matches" name="fallbackAnswer" rows={3} defaultValue={settings.fallbackAnswer} />
            <TextArea label="When the AI can't be reached" name="offlineAnswer" rows={3} defaultValue={settings.offlineAnswer} />
          </Card>
        </div>
      </PageLayout>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
