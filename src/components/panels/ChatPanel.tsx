"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ErrorNote, inputClass } from "../ui";

type Message = { role: "user" | "assistant"; content: string; trace?: string[] };

const SUGGESTIONS = [
  "What's my account type and follower count?",
  "List my recent posts with their captions",
  "Show my account insights for the last 7 days",
  "Do I have any unread direct messages?",
];

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setError(null);
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else
        setMessages([
          ...next,
          { role: "assistant", content: data.reply, trace: data.trace },
        ]);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-black/55">
              The AI can use every Instagram tool. It asks before anything that
              posts, sends or deletes.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-black/10 bg-white px-4 py-3 text-left text-sm transition hover:border-brand/40 hover:bg-brand/[0.03]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-black px-4 py-2.5 text-sm text-white"
                  : "max-w-[85%] space-y-2"
              }
            >
              {m.trace && m.trace.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.trace.map((t, j) => (
                    <span
                      key={j}
                      className="rounded-md bg-black/[0.05] px-2 py-0.5 font-mono text-[11px] text-black/55"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {m.content}
              </div>
            </div>
          </div>
        ))}

        {busy && <p className="text-sm text-black/45">Working…</p>}
        <ErrorNote>{error}</ErrorNote>
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex gap-2 border-t border-black/10 pt-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your Instagram…"
          disabled={busy}
          className={inputClass}
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
