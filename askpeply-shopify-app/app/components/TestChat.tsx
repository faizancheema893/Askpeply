import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Card, STATUS_TEXT } from "./ui";

type Turn = { role: "user" | "assistant"; content: string; status?: string; reason?: string };

/** Renders **bold**, [links](url), *italic* and "- " bullets as React nodes. */
function Rich({ text }: { text: string }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {text.split(/\n+/).map((line, i) => {
        const bullet = /^\s*[-•]\s+/.test(line) || /^\s*\*\s+/.test(line);
        const clean = line.replace(/^\s*[-•*]\s+/, "");
        const parts = clean.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g).filter(Boolean);
        return (
          <div key={i} style={bullet ? { paddingLeft: 14, position: "relative" } : undefined}>
            {bullet && <span style={{ position: "absolute", left: 0 }}>•</span>}
            {parts.map((p, j) => {
              const b = p.match(/^\*\*([^*]+)\*\*$/);
              if (b) return <strong key={j}>{b[1]}</strong>;
              const l = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
              if (l) return <u key={j} title={l[2]}>{l[1]}</u>;
              const it = p.match(/^\*([^*]+)\*$/);
              if (it) return <em key={j}>{it[1]}</em>;
              return <span key={j}>{p}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function TestChat({
  suggestions = [],
  risky = [],
  title = "Try your assistant",
  description = "Ask the way a customer would. Test chats are saved under Conversations → Tests and don't count toward your plan.",
  id,
}: {
  suggestions?: string[];
  risky?: string[];
  title?: string;
  description?: string;
  id?: string;
}) {
  const fetcher = useFetcher<any>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    const d = fetcher.data;
    if (fetcher.state === "idle" && d && d.reply !== undefined && d.__handled !== true) {
      d.__handled = true;
      setConversationId(d.conversationId || null);
      setTurns((t) => [...t, { role: "assistant", content: d.reply, status: d.status, reason: d.reason }]);
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [turns.length, busy]);

  function send(value: string) {
    const q = value.trim();
    if (!q || busy) return;
    const next = [...turns, { role: "user" as const, content: q }];
    setTurns(next);
    setText("");
    fetcher.submit(
      { conversationId, messages: next.map((t) => ({ role: t.role, content: t.content })) } as any,
      { method: "post", action: "/app/test-chat", encType: "application/json" },
    );
  }

  return (
    <Card
      id={id}
      title={title}
      description={description}
      flush
      action={
        turns.length > 0 ? (
          <button
            type="button"
            className="ap-btn ap-btn--ghost ap-btn--sm"
            onClick={() => {
              setTurns([]);
              setConversationId(null);
            }}
          >
            New chat
          </button>
        ) : undefined
      }
    >
      {(turns.length > 0 || busy) && (
        <div className="ap-chat__feed" ref={feedRef}>
          {turns.map((t, i) => (
            <div key={i} className={`ap-msg ${t.role === "user" ? "ap-msg--user" : "ap-msg--bot"}`}>
              {t.role === "assistant" && <span className="ap-avatar">A</span>}
              <div style={{ maxWidth: "84%", display: "grid", gap: 6, justifyItems: t.role === "user" ? "end" : "start" }}>
                <div className="ap-bubble">{t.role === "user" ? t.content : <Rich text={t.content} />}</div>
                {t.status && STATUS_TEXT[t.status] && (
                  <span className={`ap-tag ap-tag--${t.status}`}>
                    {STATUS_TEXT[t.status]}
                    {t.reason && t.status !== "error" ? `: ${t.reason}` : ""}
                  </span>
                )}
                {t.status === "error" && t.reason && <div className="ap-err">{t.reason}</div>}
              </div>
            </div>
          ))}
          {busy && (
            <div className="ap-msg ap-msg--bot">
              <span className="ap-avatar">A</span>
              <div className="ap-bubble ap-typing">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
        </div>
      )}

      {(suggestions.length > 0 || risky.length > 0) && (
        <div className="ap-chips" style={{ paddingTop: turns.length ? 12 : 4 }}>
          {suggestions.map((s) => (
            <button key={s} type="button" className="ap-chip" disabled={busy} onClick={() => send(s)}>
              {s}
            </button>
          ))}
          {risky.map((s) => (
            <button key={s} type="button" className="ap-chip ap-chip--risk" disabled={busy} onClick={() => send(s)} title="Should be blocked">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="ap-chat__input"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input className="ap-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a customer question" maxLength={600} />
        <button type="submit" className="ap-send" disabled={busy || !text.trim()} aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </Card>
  );
}
