import { useEffect, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

/**
 * AskPeply dashboard design system.
 * Light: quiet clinical surfaces. Dark: deep night with frosted-glass cards
 * over a soft nebula. Every color is a token, so both themes share one set
 * of components. The bot preview, home hero and featured plan stay dark in
 * both themes as the one bold "nebula" moment.
 */
export const UI_CSS = `
:root {
  --ap-bg: #F3F4F8; --ap-surface: #FFFFFF; --ap-surface-2: #F7F8FB; --ap-surface-hover: #F4F5F9;
  --ap-border: #E6E9F0; --ap-border-2: #EEF0F5; --ap-border-strong: #CDD2DE;
  --ap-text: #0E1424; --ap-text-2: #475069; --ap-text-3: #8A93A6;
  --ap-accent: #7C5CF6; --ap-accent-soft: #F3EFFF; --ap-accent-text: #5B3FD6;
  --ap-ink: #0E1424; --ap-ink-text: #FFFFFF; --ap-ink-hover: #1C2440;
  --ap-input-bg: #FFFFFF; --ap-input-border: #DCE0E8;
  --ap-good-soft: #ECFDF3; --ap-good-text: #067647; --ap-good: #12B76A;
  --ap-bad-soft: #FEF3F2; --ap-bad-text: #B42318; --ap-bad: #D92D20;
  --ap-warn-soft: #FFFAEB; --ap-warn-text: #B54708;
  --ap-info-soft: #EFF8FF; --ap-info-text: #175CD3;
  --ap-card-shadow: 0 1px 2px rgba(16, 24, 40, .04);
  --ap-card-bg: var(--ap-surface); --ap-blur: none;
  --ap-night: #070B1D;
  --ap-nebula: linear-gradient(120deg, #38BDF8, #8B5CF6 45%, #D946EF 75%, #38BDF8);
  --ap-serif: Fraunces, Georgia, serif;
  color-scheme: light;
}
html.ap-dark {
  --ap-bg: #05070F; --ap-surface: rgba(255,255,255,.045); --ap-surface-2: rgba(255,255,255,.03); --ap-surface-hover: rgba(255,255,255,.06);
  --ap-border: rgba(255,255,255,.09); --ap-border-2: rgba(255,255,255,.06); --ap-border-strong: rgba(255,255,255,.2);
  --ap-text: #EEF0F6; --ap-text-2: #A3ABBE; --ap-text-3: #6E778C;
  --ap-accent: #A78BFA; --ap-accent-soft: rgba(139,92,246,.16); --ap-accent-text: #C4B5FD;
  --ap-ink: #F1EFEA; --ap-ink-text: #0A0A0C; --ap-ink-hover: #FFFFFF;
  --ap-input-bg: rgba(255,255,255,.04); --ap-input-border: rgba(255,255,255,.12);
  --ap-good-soft: rgba(18,183,106,.14); --ap-good-text: #6CE9A6;
  --ap-bad-soft: rgba(240,68,56,.14); --ap-bad-text: #FDA29B;
  --ap-warn-soft: rgba(247,144,9,.14); --ap-warn-text: #FEC84B;
  --ap-info-soft: rgba(46,144,250,.14); --ap-info-text: #84CAFF;
  --ap-card-bg: linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.025));
  --ap-card-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 24px 48px -28px rgba(0,0,0,.8);
  --ap-blur: blur(20px) saturate(140%);
  color-scheme: dark;
}
html.ap-dark, html.ap-dark body { background: #05070F !important; color: var(--ap-text); }
.ap-fx { display: none; }
html.ap-dark .ap-fx { display: block; position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(45% 40% at 85% 0%, rgba(139,92,246,.22), transparent 70%),
    radial-gradient(40% 35% at 0% 30%, rgba(56,189,248,.10), transparent 70%),
    radial-gradient(45% 40% at 60% 100%, rgba(217,70,239,.12), transparent 70%); }
html.ap-dark .ap-fx::after { content: ""; position: absolute; inset: 0; opacity: .35;
  background-image: radial-gradient(rgba(255,255,255,.22) 1px, transparent 1.2px); background-size: 28px 28px;
  -webkit-mask-image: radial-gradient(60% 50% at 80% 10%, #000, transparent 75%); mask-image: radial-gradient(60% 50% at 80% 10%, #000, transparent 75%); }

.ap-wrap { position: relative; z-index: 1; font-family: Inter, -apple-system, "Segoe UI", system-ui, sans-serif; color: var(--ap-text); }
.ap-wrap * { box-sizing: border-box; }

/* Page header */
.ap-pagehead { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.ap-pagehead h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -.02em; color: var(--ap-text); }
.ap-pagehead p { margin: 4px 0 0; font-size: 13.5px; color: var(--ap-text-2); max-width: 64ch; line-height: 1.5; }
.ap-pagehead__tools { display: flex; gap: 8px; align-items: center; }

/* Layout */
.ap-layout { display: grid; grid-template-columns: minmax(0, 1fr) var(--ap-aside, 340px); gap: 20px; align-items: start; }
.ap-main, .ap-aside { display: grid; gap: 16px; min-width: 0; align-content: start; }
.ap-aside { position: sticky; top: 16px; }
@media (max-width: 980px) { .ap-layout { grid-template-columns: minmax(0, 1fr); } .ap-aside { position: static; } }

/* Card */
.ap-card { position: relative; background: var(--ap-card-bg); border: 1px solid var(--ap-border); border-radius: 16px; box-shadow: var(--ap-card-shadow); -webkit-backdrop-filter: var(--ap-blur); backdrop-filter: var(--ap-blur); }
.ap-card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 20px 0; }
.ap-card__title { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: -.01em; color: var(--ap-text); }
.ap-card__desc { margin: 4px 0 0; font-size: 13px; line-height: 1.5; color: var(--ap-text-2); max-width: 64ch; }
.ap-card__body { padding: 16px 20px 20px; display: grid; gap: 14px; }
.ap-card__body--flush { padding: 8px 0 6px; }

.ap-muted { color: var(--ap-text-2); font-size: 13px; line-height: 1.5; }
.ap-faint { color: var(--ap-text-3); font-size: 12px; }

/* Buttons */
.ap-btn { appearance: none; border: 1px solid transparent; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: 10px; font: 600 13px/1 Inter, system-ui, sans-serif; text-decoration: none; transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, color .15s ease; white-space: nowrap; }
.ap-btn:focus-visible, .ap-tab:focus-visible, .ap-theme:focus-visible { outline: 2px solid var(--ap-accent); outline-offset: 2px; }
.ap-btn--primary { background: var(--ap-ink); color: var(--ap-ink-text); }
.ap-btn--primary:hover { background: var(--ap-ink-hover); }
html.ap-dark .ap-btn--primary { box-shadow: 0 0 24px -10px rgba(167,139,250,.9); }
.ap-btn--secondary { background: var(--ap-surface); color: var(--ap-text); border-color: var(--ap-border); }
.ap-btn--secondary:hover { border-color: var(--ap-border-strong); background: var(--ap-surface-hover); }
.ap-btn--ghost { background: transparent; color: var(--ap-text-2); }
.ap-btn--ghost:hover { background: var(--ap-surface-hover); color: var(--ap-text); }
.ap-btn--pearl { background: #F1EFEA; color: #0A0A0C; box-shadow: 0 0 24px -8px rgba(139,92,246,.75); }
.ap-btn--pearl:hover { background: #fff; }
.ap-btn--glass { background: rgba(255,255,255,.07); color: #fff; border-color: rgba(255,255,255,.18); }
.ap-btn--glass:hover { background: rgba(255,255,255,.13); }
.ap-btn--danger { background: transparent; color: var(--ap-bad-text); }
.ap-btn--danger:hover { background: var(--ap-bad-soft); }
.ap-btn:disabled { opacity: .45; cursor: default; }
.ap-btn--sm { height: 30px; padding: 0 10px; font-size: 12.5px; border-radius: 8px; }

/* Theme switch */
.ap-themeswitch { display: inline-flex; padding: 3px; border-radius: 999px; border: 1px solid var(--ap-border); background: var(--ap-surface); -webkit-backdrop-filter: var(--ap-blur); backdrop-filter: var(--ap-blur); }
.ap-themeswitch button { appearance: none; border: 0; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 11px; border-radius: 999px; background: transparent; color: var(--ap-text-2); font: 600 12px/1 Inter, system-ui, sans-serif; }
.ap-themeswitch button[aria-pressed="true"] { background: var(--ap-ink); color: var(--ap-ink-text); }

/* Segmented (small toggles) */
.ap-seg { display: inline-flex; padding: 3px; gap: 2px; background: var(--ap-surface-2); border: 1px solid var(--ap-border); border-radius: 11px; flex-wrap: wrap; }
.ap-seg button { appearance: none; border: 0; cursor: pointer; height: 28px; padding: 0 11px; border-radius: 8px; background: transparent; color: var(--ap-text-2); font: 600 12.5px/1 Inter, system-ui, sans-serif; }
.ap-seg button[aria-pressed="true"] { background: var(--ap-surface); color: var(--ap-text); box-shadow: 0 1px 2px rgba(16,24,40,.1), 0 0 0 1px var(--ap-border); }
html.ap-dark .ap-seg button[aria-pressed="true"] { background: rgba(255,255,255,.1); box-shadow: inset 0 1px 0 rgba(255,255,255,.08); }

/* Tabs (filters with icons and counts) */
.ap-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.ap-tab { appearance: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px 0 10px; border-radius: 10px; border: 1px solid var(--ap-border); background: var(--ap-surface); color: var(--ap-text-2); font: 600 13px/1 Inter, system-ui, sans-serif; transition: border-color .15s, background .15s, color .15s; }
.ap-tab:hover { border-color: var(--ap-border-strong); color: var(--ap-text); }
.ap-tab svg { color: var(--ap-text-3); }
.ap-tab__count { min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px; display: inline-grid; place-items: center; background: var(--ap-surface-2); border: 1px solid var(--ap-border-2); color: var(--ap-text-2); font: 600 11.5px/1 Inter, system-ui, sans-serif; font-variant-numeric: tabular-nums; }
.ap-tab[aria-pressed="true"] { background: var(--ap-ink); border-color: var(--ap-ink); color: var(--ap-ink-text); }
.ap-tab[aria-pressed="true"] svg { color: inherit; opacity: .85; }
.ap-tab[aria-pressed="true"] .ap-tab__count { background: rgba(255,255,255,.16); border-color: transparent; color: inherit; }
html.ap-dark .ap-tab[aria-pressed="true"] { background: linear-gradient(rgba(30,26,58,.9), rgba(30,26,58,.9)) padding-box, var(--ap-nebula) border-box; border-color: transparent; color: #fff; box-shadow: 0 0 22px -8px rgba(167,139,250,.8); }
html.ap-dark .ap-tab[aria-pressed="true"] .ap-tab__count { background: rgba(255,255,255,.12); }

/* Status tags */
.ap-tag { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px; border-radius: 6px; font: 600 11.5px/1 Inter, system-ui, sans-serif; white-space: nowrap; background: var(--ap-surface-2); color: var(--ap-text-2); border: 1px solid var(--ap-border-2); }
.ap-tag::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .9; }
.ap-tag--plain::before { display: none; }
.ap-tag--answered, .ap-tag--good { background: var(--ap-good-soft); color: var(--ap-good-text); border-color: transparent; }
.ap-tag--blocked, .ap-tag--error, .ap-tag--limit, .ap-tag--bad { background: var(--ap-bad-soft); color: var(--ap-bad-text); border-color: transparent; }
.ap-tag--escalated, .ap-tag--warn { background: var(--ap-warn-soft); color: var(--ap-warn-text); border-color: transparent; }
.ap-tag--unanswered, .ap-tag--info { background: var(--ap-info-soft); color: var(--ap-info-text); border-color: transparent; }
.ap-tag--brand { background: var(--ap-accent-soft); color: var(--ap-accent-text); border-color: transparent; }

/* Metric strip */
.ap-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.ap-metric { padding: 18px 20px; display: grid; gap: 6px; }
.ap-metric + .ap-metric { border-left: 1px solid var(--ap-border-2); }
.ap-metric__label { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ap-text-2); }
.ap-metric__label svg { color: var(--ap-text-3); }
.ap-metric__value { font: 650 26px/1.1 Inter, system-ui, sans-serif; letter-spacing: -.02em; color: var(--ap-text); font-variant-numeric: tabular-nums; }
.ap-metric__hint { font-size: 12px; color: var(--ap-text-3); }
@media (max-width: 760px) { .ap-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ap-metric:nth-child(3) { border-left: 0; } .ap-metric:nth-child(n+3) { border-top: 1px solid var(--ap-border-2); } }

.ap-meter { height: 6px; border-radius: 999px; background: var(--ap-border-2); overflow: hidden; }
.ap-meter > span { display: block; height: 100%; border-radius: inherit; background: var(--ap-ink); }
html.ap-dark .ap-meter > span { background: var(--ap-nebula); }

/* Rows */
.ap-rows { display: grid; }
.ap-row { display: flex; align-items: center; gap: 14px; padding: 12px 20px; border-top: 1px solid var(--ap-border-2); text-align: left; width: 100%; background: none; border-left: 0; border-right: 0; border-bottom: 0; font: inherit; color: inherit; }
.ap-row:first-child { border-top: 0; }
button.ap-row { cursor: pointer; }
button.ap-row:hover, .ap-row--hover:hover { background: var(--ap-surface-hover); }
.ap-row__main { flex: 1; min-width: 0; display: grid; gap: 3px; }
.ap-row__title { font-size: 13.5px; font-weight: 600; color: var(--ap-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-row__sub { font-size: 12.5px; color: var(--ap-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-row__meta { font-size: 12px; color: var(--ap-text-3); white-space: nowrap; }
.ap-tile { width: 36px; height: 36px; flex: none; border-radius: 10px; display: grid; place-items: center; }
.ap-tile--product { background: rgba(124,92,246,.12); color: #7C5CF6; }
.ap-tile--page { background: rgba(14,165,233,.12); color: #0284C7; }
.ap-tile--policy { background: rgba(18,183,106,.12); color: #079455; }
.ap-tile--custom { background: rgba(247,144,9,.14); color: #DC6803; }
.ap-tile--document { background: rgba(217,70,239,.12); color: #C026D3; }
html.ap-dark .ap-tile--product { color: #C4B5FD; } html.ap-dark .ap-tile--page { color: #7DD3FC; }
html.ap-dark .ap-tile--policy { color: #6CE9A6; } html.ap-dark .ap-tile--custom { color: #FEC84B; } html.ap-dark .ap-tile--document { color: #F0ABFC; }
.ap-price { font: 600 13px/1 Inter, system-ui, sans-serif; color: var(--ap-text); font-variant-numeric: tabular-nums; }
.ap-empty { padding: 40px 20px; text-align: center; display: grid; gap: 6px; justify-items: center; }
.ap-empty strong { font-size: 14px; color: var(--ap-text); }
.ap-searchbar { display: flex; gap: 10px; align-items: center; padding: 0 20px 14px; flex-wrap: wrap; }

/* Checklist */
.ap-check { display: grid; }
.ap-check__row { display: flex; align-items: center; gap: 14px; padding: 13px 20px; border-top: 1px solid var(--ap-border-2); }
.ap-check__row:first-child { border-top: 0; }
.ap-check__num { width: 26px; height: 26px; flex: none; border-radius: 50%; display: grid; place-items: center; font: 650 12px/1 Inter, system-ui, sans-serif; color: var(--ap-text-2); border: 1.5px solid var(--ap-border-strong); }
.ap-check__row--done .ap-check__num { border-color: transparent; background: linear-gradient(135deg, #12B76A, #0E9F6E); color: #fff; box-shadow: 0 2px 6px -2px rgba(18,183,106,.6); }
.ap-check__row--done .ap-check__title { color: var(--ap-text-2); }
.ap-check__title { font-size: 13.5px; font-weight: 600; color: var(--ap-text); }

/* Hero (home) — dark in both themes */
.ap-hero { position: relative; overflow: hidden; border-radius: 20px; background: var(--ap-night); color: #F2F1EE; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); min-height: 300px; }
html.ap-dark .ap-hero { border: 1px solid rgba(255,255,255,.1); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 30px 60px -30px rgba(124,92,246,.5); }
.ap-hero::before { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(60% 80% at 85% 10%, rgba(139,92,246,.42), transparent 60%), radial-gradient(50% 70% at 60% 110%, rgba(217,70,239,.26), transparent 60%), radial-gradient(40% 60% at 0% 0%, rgba(56,189,248,.16), transparent 60%); }
.ap-hero::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .5;
  background-image: radial-gradient(rgba(255,255,255,.28) 1px, transparent 1.2px); background-size: 24px 24px;
  -webkit-mask-image: radial-gradient(70% 90% at 80% 40%, #000, transparent 75%); mask-image: radial-gradient(70% 90% at 80% 40%, #000, transparent 75%); }
.ap-hero__copy { position: relative; z-index: 1; padding: 30px 32px; display: grid; align-content: center; gap: 14px; }
.ap-hero__status { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: rgba(242,241,238,.75); }
.ap-hero__title { margin: 0; font-family: var(--ap-serif); font-weight: 600; font-size: 34px; line-height: 1.08; letter-spacing: -.02em; color: #fff; }
.ap-hero__text { margin: 0; font-size: 14px; line-height: 1.6; color: rgba(242,241,238,.7); max-width: 46ch; }
.ap-hero__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
.ap-hero__stage { position: relative; z-index: 1; min-height: 300px; }
.ap-livedot { width: 8px; height: 8px; border-radius: 50%; background: #38BDF8; animation: ap-pulse 2.2s infinite; }
.ap-livedot--off { background: #F79009; animation: none; }
@keyframes ap-pulse { 0% { box-shadow: 0 0 0 0 rgba(56,189,248,.55); } 70% { box-shadow: 0 0 0 9px rgba(56,189,248,0); } 100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); } }
@media (max-width: 860px) { .ap-hero { grid-template-columns: 1fr; } .ap-hero__stage { min-height: 220px; } }

/* Bot preview stage */
.ap-stage { position: relative; overflow: hidden; transform: translateZ(0); border-radius: 14px; }
.ap-stage--page { height: 470px; border: 1px solid var(--ap-border); }
.ap-stage--hero { position: absolute; inset: 0; border-radius: 0; }
.ap-stage .ap-root.apb { --apb-w: 270px; --apb-w-open: 330px; }
.ap-stage--hero .ap-root.apb { --apb-w: 300px; --apb-w-open: 330px; }
.ap-stage .apb-panel { max-height: 300px; }
.ap-stage .apb-input { pointer-events: none; }
.ap-shop { position: absolute; inset: 0; padding: 18px; display: grid; align-content: start; gap: 10px; }
.ap-shop--light { background: #FAFAF8; }
.ap-shop--dark { background: #04060F; }
.ap-shop__nav { display: flex; justify-content: space-between; align-items: center; }
.ap-shop__logo { width: 70px; height: 10px; border-radius: 5px; }
.ap-shop__links { display: flex; gap: 8px; }
.ap-shop__links i { width: 28px; height: 6px; border-radius: 3px; }
.ap-shop__grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 8px; }
.ap-shop__card { height: 92px; border-radius: 10px; }
.ap-shop__line { height: 8px; border-radius: 4px; }
.ap-shop--light .ap-shop__logo, .ap-shop--light .ap-shop__line { background: #E3E5EA; }
.ap-shop--light .ap-shop__links i { background: #ECEEF2; }
.ap-shop--light .ap-shop__card { background: #EEF0F3; }
.ap-shop--dark .ap-shop__logo, .ap-shop--dark .ap-shop__line { background: #1A2036; }
.ap-shop--dark .ap-shop__links i { background: #141a2e; }
.ap-shop--dark .ap-shop__card { background: #0E1426; }
.ap-stage__bar { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Chat */
.ap-chat__feed { display: grid; gap: 12px; padding: 16px 20px; max-height: 440px; overflow-y: auto; border-top: 1px solid var(--ap-border-2); }
.ap-msg { display: flex; gap: 10px; align-items: flex-start; }
.ap-msg--user { flex-direction: row-reverse; }
.ap-avatar { width: 28px; height: 28px; flex: none; border-radius: 9px; display: grid; place-items: center; color: #fff; font: 700 12px/1 Inter, system-ui, sans-serif; background: linear-gradient(135deg, #8B5CF6, #D946EF); }
.ap-bubble { padding: 10px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.55; overflow-wrap: anywhere; }
.ap-msg--user .ap-bubble { background: var(--ap-ink); color: var(--ap-ink-text); border-top-right-radius: 4px; }
.ap-msg--bot .ap-bubble { background: var(--ap-surface-2); color: var(--ap-text); border: 1px solid var(--ap-border-2); border-top-left-radius: 4px; }
html.ap-dark .ap-msg--bot .ap-bubble { border-left: 2px solid rgba(56,189,248,.6); }
.ap-bubble u { color: var(--ap-info-text); text-decoration-thickness: 1px; }
.ap-err { font: 400 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--ap-bad-text); background: var(--ap-bad-soft); border-radius: 8px; padding: 8px 10px; }
.ap-typing { display: inline-flex; gap: 4px; padding: 13px 14px; }
.ap-typing i { width: 5px; height: 5px; border-radius: 50%; background: var(--ap-text-3); animation: ap-bounce 1.1s infinite ease-in-out; }
.ap-typing i:nth-child(2) { animation-delay: .15s; } .ap-typing i:nth-child(3) { animation-delay: .3s; }
@keyframes ap-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .5; } 30% { transform: translateY(-4px); opacity: 1; } }
.ap-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 20px 12px; }
.ap-chip { appearance: none; cursor: pointer; border: 1px solid var(--ap-border); background: var(--ap-surface); color: var(--ap-text); border-radius: 999px; height: 30px; padding: 0 12px; font: 500 12.5px/1 Inter, system-ui, sans-serif; }
.ap-chip:hover { border-color: var(--ap-accent); }
.ap-chip--risk { color: var(--ap-bad-text); border-color: color-mix(in srgb, var(--ap-bad-text) 30%, transparent); }
.ap-chip--risk:hover { background: var(--ap-bad-soft); border-color: var(--ap-bad-text); }
.ap-chat__input { display: flex; gap: 8px; padding: 12px 16px 16px; }
.ap-send { width: 40px; height: 40px; flex: none; border-radius: 12px; border: 0; cursor: pointer; display: grid; place-items: center; color: var(--ap-ink-text); background: var(--ap-ink); }
.ap-send:disabled { opacity: .4; cursor: default; }

/* Form controls */
.ap-field { display: grid; gap: 6px; }
.ap-label { font-size: 13px; font-weight: 600; color: var(--ap-text); }
.ap-help { font-size: 12px; color: var(--ap-text-3); line-height: 1.45; }
.ap-input, .ap-textarea, .ap-select {
  width: 100%; border: 1px solid var(--ap-input-border); background: var(--ap-input-bg); color: var(--ap-text);
  border-radius: 10px; font: 400 13.5px/1.45 Inter, system-ui, sans-serif; outline: none; transition: border-color .15s, box-shadow .15s;
}
.ap-input, .ap-select { height: 40px; padding: 0 12px; }
.ap-textarea { padding: 10px 12px; resize: vertical; min-height: 72px; }
.ap-input::placeholder, .ap-textarea::placeholder { color: var(--ap-text-3); }
.ap-input:focus, .ap-textarea:focus, .ap-select:focus { border-color: var(--ap-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ap-accent) 22%, transparent); }
.ap-input:disabled, .ap-textarea:disabled { opacity: .5; }
.ap-select { appearance: none; padding-right: 34px; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A93A6' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center; }
html.ap-dark .ap-select option { background: #121626; color: #EEF0F6; }
.ap-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 640px) { .ap-grid2 { grid-template-columns: 1fr; } }
.ap-toggle { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 12px 0; border-top: 1px solid var(--ap-border-2); cursor: pointer; }
.ap-toggle:first-child { border-top: 0; padding-top: 2px; }
.ap-toggle--disabled { opacity: .55; cursor: default; }
.ap-switch { position: relative; flex: none; width: 38px; height: 22px; margin-top: 1px; }
.ap-switch input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: inherit; }
.ap-switch span { position: absolute; inset: 0; border-radius: 999px; background: var(--ap-border-strong); transition: background .2s; }
.ap-switch span::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .2s; }
.ap-switch input:checked + span { background: var(--ap-good); }
html.ap-dark .ap-switch input:checked + span { background: linear-gradient(135deg, #8B5CF6, #D946EF); }
.ap-switch input:checked + span::after { transform: translateX(16px); }
.ap-switch input:focus-visible + span { outline: 2px solid var(--ap-accent); outline-offset: 2px; }
.ap-qbox { display: grid; gap: 12px; padding: 14px; border-radius: 12px; border: 1px solid var(--ap-border); background: var(--ap-surface-2); }
.ap-qbox__num { font-size: 12px; font-weight: 650; color: var(--ap-text-3); }
.ap-banner { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; font-size: 13px; line-height: 1.5; background: var(--ap-warn-soft); color: var(--ap-warn-text); }

/* Color controls */
.ap-themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 10px; }
.ap-theme { appearance: none; cursor: pointer; text-align: left; padding: 10px; border-radius: 12px; border: 1px solid var(--ap-border); background: var(--ap-surface); display: grid; gap: 8px; font: 600 12.5px/1.2 Inter, system-ui, sans-serif; color: var(--ap-text); }
.ap-theme:hover { border-color: var(--ap-border-strong); }
.ap-theme[aria-pressed="true"] { border-color: var(--ap-ink); box-shadow: 0 0 0 1px var(--ap-ink); }
.ap-theme__swatch { height: 34px; border-radius: 8px; display: flex; align-items: center; padding: 0 8px; gap: 6px; border: 1px solid rgba(127,127,127,.15); }
.ap-theme__swatch i { flex: 1; height: 8px; border-radius: 4px; opacity: .85; }
.ap-theme__swatch b { width: 16px; height: 16px; border-radius: 50%; }
.ap-colors { display: grid; gap: 18px; }
.ap-colors__group { display: grid; gap: 4px; }
.ap-colors__group h4 { margin: 0 0 4px; font-size: 12.5px; font-weight: 650; color: var(--ap-text-2); }
.ap-color { display: grid; grid-template-columns: 36px minmax(0, 1fr) 96px; align-items: center; gap: 12px; padding: 8px 0; border-top: 1px solid var(--ap-border-2); }
.ap-color:first-of-type { border-top: 0; }
.ap-color__well { position: relative; width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(127,127,127,.25); overflow: hidden; cursor: pointer; }
.ap-color__well input { position: absolute; inset: -8px; width: calc(100% + 16px); height: calc(100% + 16px); border: 0; padding: 0; cursor: pointer; opacity: 0; }
.ap-color__name { font-size: 13px; font-weight: 600; color: var(--ap-text); }
.ap-color__help { font-size: 12px; color: var(--ap-text-3); margin-top: 2px; }
.ap-color__hex { height: 32px; width: 100%; border: 1px solid var(--ap-input-border); background: var(--ap-input-bg); border-radius: 8px; padding: 0 8px; font: 500 12.5px/1 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; color: var(--ap-text); outline: none; }
.ap-color__hex:focus { border-color: var(--ap-accent); }

/* Plans */
.ap-plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
@media (max-width: 900px) { .ap-plans { grid-template-columns: 1fr; } }
.ap-plan { position: relative; display: flex; flex-direction: column; gap: 18px; padding: 24px; border-radius: 18px; border: 1px solid var(--ap-border); background: var(--ap-card-bg); box-shadow: var(--ap-card-shadow); -webkit-backdrop-filter: var(--ap-blur); backdrop-filter: var(--ap-blur); color: var(--ap-text); }
.ap-plan__name { font-size: 14px; font-weight: 650; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ap-plan__price { display: flex; align-items: baseline; gap: 6px; }
.ap-plan__price b { font-family: var(--ap-serif); font-weight: 600; font-size: 46px; line-height: 1; letter-spacing: -.03em; }
.ap-plan__price span { font-size: 13px; color: var(--ap-text-2); }
.ap-plan__for { font-size: 13.5px; line-height: 1.5; color: var(--ap-text-2); margin: 0; }
.ap-plan__volume { padding: 10px 12px; border-radius: 10px; background: var(--ap-surface-2); font-size: 13px; }
.ap-plan__volume b { font-variant-numeric: tabular-nums; }
.ap-plan ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; flex: 1; }
.ap-plan li { display: flex; gap: 10px; font-size: 13.5px; line-height: 1.45; }
.ap-plan li svg { flex: none; margin-top: 2px; color: var(--ap-good); }
.ap-plan .ap-btn { width: 100%; height: 40px; }
.ap-plan--featured { background: var(--ap-night); color: #F2F1EE; border-color: transparent; box-shadow: 0 24px 48px -28px rgba(124,92,246,.7); -webkit-backdrop-filter: none; backdrop-filter: none; }
.ap-plan--featured::before { content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px; background: var(--ap-nebula); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
.ap-plan--featured .ap-plan__for, .ap-plan--featured .ap-plan__price span { color: rgba(242,241,238,.7); }
.ap-plan--featured .ap-plan__volume { background: rgba(255,255,255,.07); }
.ap-plan--featured li svg { color: #38BDF8; }
.ap-plan--current { border-color: var(--ap-text); }

/* Upload */
.ap-drop { display: grid; justify-items: center; gap: 6px; padding: 22px; border: 1.5px dashed var(--ap-border-strong); border-radius: 12px; text-align: center; background: var(--ap-surface-2); cursor: pointer; color: var(--ap-text); }
.ap-drop:hover { border-color: var(--ap-accent); }
.ap-lock { display: flex; gap: 12px; align-items: flex-start; padding: 14px; border-radius: 12px; background: var(--ap-accent-soft); color: var(--ap-accent-text); font-size: 13px; line-height: 1.5; }
`;

const THEME_KEY = "askpeply:theme";
const BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(!t&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("ap-dark")}catch(e){}`;

export function UIStyles() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=JetBrains+Mono:wght@500;700&display=swap"
      />
      <style dangerouslySetInnerHTML={{ __html: UI_CSS }} />
      <div className="ap-fx" aria-hidden="true" />
    </>
  );
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    // Re-apply the saved choice on every page, so the page and the switch always agree.
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {
      /* storage blocked */
    }
    const dark = saved ? saved === "dark" : document.documentElement.classList.contains("ap-dark");
    document.documentElement.classList.toggle("ap-dark", dark);
    setTheme(dark ? "dark" : "light");
  }, []);
  const set = (t: "light" | "dark") => {
    setTheme(t);
    document.documentElement.classList.toggle("ap-dark", t === "dark");
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* storage blocked */
    }
  };
  return [theme, set] as const;
}

export function ThemeSwitch() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="ap-themeswitch" role="group" aria-label="Dashboard theme">
      <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
        <Icon name="sun" size={14} />
        Light
      </button>
      <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
        <Icon name="moon" size={14} />
        Dark
      </button>
    </div>
  );
}

/** Page header + main column + side column that stays visible while scrolling. */
export function PageLayout({
  title,
  description,
  tools,
  children,
  aside,
  asideWidth,
}: {
  title?: ReactNode;
  description?: ReactNode;
  tools?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  asideWidth?: number;
}) {
  const head = (
    <div className="ap-pagehead">
      <div>
        {title && <h1>{title}</h1>}
        {description && <p>{description}</p>}
      </div>
      <div className="ap-pagehead__tools">
        {tools}
        <ThemeSwitch />
      </div>
    </div>
  );
  return (
    <div className="ap-wrap">
      {head}
      {aside ? (
        <div className="ap-layout" style={asideWidth ? ({ "--ap-aside": `${asideWidth}px` } as any) : undefined}>
          <div className="ap-main">{children}</div>
          <aside className="ap-aside">{aside}</aside>
        </div>
      ) : (
        <div className="ap-main">{children}</div>
      )}
    </div>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  flush,
  className,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  flush?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`ap-card ${className || ""}`} id={id}>
      {(title || action) && (
        <div className="ap-card__head">
          <div>
            {title && <h3 className="ap-card__title">{title}</h3>}
            {description && <p className="ap-card__desc">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children !== undefined && <div className={flush ? "ap-card__body--flush" : "ap-card__body"}>{children}</div>}
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="ap-seg" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; count?: number; icon?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="ap-tabs" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" className="ap-tab" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={15} />}
          {o.label}
          {o.count !== undefined && <span className="ap-tab__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- form controls (native, themed; `name` works with collectFields) ---------- */

export function Field({ label, help, children }: { label?: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <label className="ap-field">
      {label && <span className="ap-label">{label}</span>}
      {children}
      {help && <span className="ap-help">{help}</span>}
    </label>
  );
}

export function TextInput({ label, help, ...rest }: { label?: ReactNode; help?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} help={help}>
      <input className="ap-input" {...rest} />
    </Field>
  );
}

export function TextArea({ label, help, ...rest }: { label?: ReactNode; help?: ReactNode } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} help={help}>
      <textarea className="ap-textarea" rows={3} {...rest} />
    </Field>
  );
}

export function Select({
  label,
  help,
  options,
  ...rest
}: { label?: ReactNode; help?: ReactNode; options: { value: string; label: string }[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} help={help}>
      <select className="ap-select" {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({
  label,
  help,
  name,
  defaultChecked,
  disabled,
}: {
  label: ReactNode;
  help?: ReactNode;
  name: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={`ap-toggle ${disabled ? "ap-toggle--disabled" : ""}`}>
      <span style={{ display: "grid", gap: 3 }}>
        <span className="ap-label">{label}</span>
        {help && <span className="ap-help">{help}</span>}
      </span>
      <span className="ap-switch">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} />
        <span />
      </span>
    </label>
  );
}

/* Line icons (24px grid, round caps). Each entry is the inner SVG markup. */
const ICONS: Record<string, string> = {
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  spark: '<path d="M9.94 14.06 4 12l5.94-2.06L12 4l2.06 5.94L20 12l-5.94 2.06L12 20Z"/><path d="M19 3v4M17 5h4"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  flag: '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.33 2q2 0 3.07-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.53"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  upload: '<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
  doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  box: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.73a2 2 0 0 0 2 0L20.7 7"/>',
  page: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  qa: '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.96 6.01 17.46 2 12 2z"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

export function Icon({ name, size = 16, stroke = 1.75 }: { name: string; size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
      dangerouslySetInnerHTML={{ __html: ICONS[name] || "" }}
    />
  );
}

export const STATUS_TEXT: Record<string, string> = {
  answered: "Answered",
  blocked: "Blocked",
  escalated: "Needs your team",
  unanswered: "Not in knowledge",
  error: "AI error",
  limit: "Plan limit",
};
