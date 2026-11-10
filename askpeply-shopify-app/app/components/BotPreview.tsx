import { useEffect, useState } from "react";
import type { BotSettings } from "../lib/defaults";
import { ASKBAR_CSS } from "./askbarCss";

export type PreviewState = "closed" | "open" | "chat";

function rgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "0, 0, 0";
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function botStyleVars(s: BotSettings, scale = 1): Record<string, string> {
  return {
    "--apb-side": `${Math.round(s.sideOffset * scale)}px`,
    "--apb-bottom": `${Math.round(s.bottomOffset * scale)}px`,
    "--ap-cyan": s.accentCyan,
    "--ap-cyan-rgb": rgb(s.accentCyan),
    "--ap-violet": s.accentViolet,
    "--ap-violet-rgb": rgb(s.accentViolet),
    "--ap-fuchsia": s.accentFuchsia,
    "--ap-fuchsia-rgb": rgb(s.accentFuchsia),
    "--apb-bar-bg": s.barBg,
    "--apb-bar-text": s.barText,
    "--apb-panel-bg": s.panelBg,
    "--apb-chip-bg": s.chipBg,
    "--apb-chip-text": s.chipText,
    "--apb-bot-bg": s.botBg,
    "--apb-bot-text": s.botText,
    "--apb-user-bg": s.userBg,
    "--apb-user-text": s.userText,
    "--apb-note": s.noteColor,
  };
}

/** Types, pauses, erases and rotates lines, like the real closed bar. */
function useTypewriter(lines: string[], active: boolean) {
  const [text, setText] = useState("");
  const key = lines.join("\n");
  useEffect(() => {
    if (!active || !lines.length) return;
    let line = 0;
    let i = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const l = lines[line];
      if (!deleting) {
        i++;
        setText(l.slice(0, i));
        if (i >= l.length) {
          deleting = true;
          timer = setTimeout(tick, 1800);
          return;
        }
        timer = setTimeout(tick, 40 + Math.random() * 40);
      } else {
        i--;
        setText(l.slice(0, i));
        if (i <= 0) {
          deleting = false;
          line = (line + 1) % lines.length;
          timer = setTimeout(tick, 350);
          return;
        }
        timer = setTimeout(tick, 18);
      }
    };
    tick();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active]);
  return text;
}

export function BotPreview({
  s,
  state,
  page = "light",
  variant = "page",
}: {
  s: BotSettings;
  state: PreviewState;
  page?: "light" | "dark" | "none";
  variant?: "page" | "hero";
}) {
  const lines = s.typingLines.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const typed = useTypewriter(lines.length ? lines : [s.placeholder], state === "closed");
  const chips = s.suggested.map((q) => q.question).filter(Boolean).slice(0, 4);
  const avatar = (s.botName || "A").charAt(0).toUpperCase();
  const isOpen = state !== "closed";
  const sampleQ = chips[1] || chips[0] || "Can I see the COA for this batch?";

  return (
    <div className={`ap-stage ${variant === "hero" ? "ap-stage--hero" : "ap-stage--page"}`}>
      <style dangerouslySetInnerHTML={{ __html: ASKBAR_CSS }} />
      {page !== "none" && (
        <div className={`ap-shop ap-shop--${page}`} aria-hidden="true">
          <div className="ap-shop__nav">
            <span className="ap-shop__logo" />
            <span className="ap-shop__links">
              <i />
              <i />
              <i />
            </span>
          </div>
          <span className="ap-shop__line" style={{ width: "55%", height: 14, marginTop: 14 }} />
          <span className="ap-shop__line" style={{ width: "38%" }} />
          <div className="ap-shop__grid">
            <span className="ap-shop__card" />
            <span className="ap-shop__card" />
            <span className="ap-shop__card" />
          </div>
        </div>
      )}

      <div
        className={`ap-root apb apb--${s.position} ${isOpen ? "is-open" : ""} ${state === "chat" ? "has-chat" : ""}`}
        style={botStyleVars(s, variant === "hero" ? 0.8 : 0.7) as any}
      >
        <div className="apb-dock">
          <div className="apb-panel" role="presentation">
            <div className="apb-head">
              <div className="apb-title">
                <span className="ap-status-dot" />
                <span className="truncate">
                  {s.botName} <small>· Live</small>
                </span>
              </div>
              <div className="apb-head-actions">
                <span className="apb-head-btn">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="apb-head-btn">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="apb-feed ap-chat-feed">
              <div className="ap-chat-msg user">
                <div className="ap-msg-bubble ap-user-bubble">{sampleQ}</div>
              </div>
              <div className="ap-chat-msg bot">
                <div className="ap-msg-avatar">{avatar}</div>
                <div className="ap-msg-bubble ap-bot-bubble">
                  <p>
                    Yes. The <strong>Certificate of Analysis</strong> for every batch is on the product page, with purity and
                    test date.
                  </p>
                  <p>
                    Store sealed vials refrigerated and away from light. <a href="#preview">See storage guide</a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="apb-chips">
            {chips.map((c, i) => (
              <span key={c + i} className="apb-chip" style={{ "--i": i } as any}>
                {c}
              </span>
            ))}
          </div>

          <div className="apb-bar">
            <label className="apb-field">
              <input className="apb-input" type="text" readOnly tabIndex={-1} placeholder={isOpen ? s.placeholder : ""} />
              <span className="apb-ghost" aria-hidden="true">
                <span className="apb-ghost-text">{typed}</span>
                <span className="apb-caret" />
              </span>
            </label>
            {s.showMic && (
              <span className="apb-icon apb-mic">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
                  <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
            )}
            <span className="apb-send">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>

          {s.note && <p className="apb-note">{s.note}</p>}
        </div>
      </div>
    </div>
  );
}
