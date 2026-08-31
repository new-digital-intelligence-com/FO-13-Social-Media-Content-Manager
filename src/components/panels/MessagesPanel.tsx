"use client";

import { useEffect, useState } from "react";
import { AiAssist } from "../AiAssist";
import { Button, Card, Empty, ErrorNote, Loading, Note, inputClass } from "../ui";

type Conversation = {
  id: string;
  updatedAt?: string;
  username: string | null;
  recipientId: string | null;
  preview: string;
};

type Attachment =
  | { kind: "image"; url: string; width?: number; height?: number }
  | { kind: "video"; url: string; poster?: string }
  | { kind: "file"; url: string; name?: string };

type Message = {
  id: string;
  text: string;
  createdAt?: string;
  from?: { username?: string };
  mine: boolean;
  attachments: Attachment[];
};

export function MessagesPanel() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [note, setNote] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [threadContext, setThreadContext] = useState<string | undefined>();
  const [recipientId, setRecipientId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ig/messages")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        setConversations(d.conversations ?? []);
        setNote(d.note);
      })
      .catch(() => !cancelled && setError("Network error."));
    return () => {
      cancelled = true;
    };
  }, []);

  // The recipient comes from the thread's messages -- the conversation object
  // itself carries no participants.
  const target = recipientId ?? active?.recipientId ?? null;

  async function send() {
    if (!draft.trim()) return;
    if (!target) return setStatus("No recipient found in this conversation yet.");
    setStatus("Sending…");
    const res = await fetch("/api/ig/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: target, text: draft }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Sent." : data.error);
    if (res.ok) setDraft("");
  }

  async function markSeen() {
    if (!target) return;
    await fetch("/api/ig/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: target, markSeen: true }),
    });
    setStatus("Marked as read.");
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!conversations) return <Loading label="Loading inbox…" />;

  return (
    <div className="space-y-5">
      <Note>{note}</Note>

      {conversations.length === 0 ? (
        <Empty
          title="No conversations"
          hint="Either the account has no DMs yet, or the Meta app is missing the instagram_business_manage_messages permission."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Card className="h-fit">
            <ul className="space-y-1">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setActive(c);
                      setRecipientId(null);
                      setStatus(null);
                    }}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                      active?.id === c.id ? "bg-black/[0.06]" : "hover:bg-black/[0.03]"
                    }`}
                  >
                    <span className="block truncate text-sm font-medium">
                      @{c.username ?? "unknown"}
                    </span>
                    {c.preview && (
                      <span className="block truncate text-xs text-black/50">
                        {c.preview}
                      </span>
                    )}
                    <span className="block text-xs text-black/40">
                      {c.updatedAt?.slice(0, 10)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            {!active ? (
              <p className="text-sm text-black/45">Select a conversation.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">@{active.username ?? "unknown"}</h3>
                  <Button variant="ghost" onClick={markSeen} disabled={!target}>
                    Mark read
                  </Button>
                </div>

                <Thread
                  key={active.id}
                  conversationId={active.id}
                  onLoaded={(context, recipient) => {
                    setThreadContext(context);
                    if (recipient) setRecipientId(recipient);
                  }}
                />

                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="Write a reply…"
                  className={inputClass}
                />
                <AiAssist
                  task="dm-reply"
                  context={threadContext}
                  placeholder="What should the reply say?"
                  onInsert={setDraft}
                />
                <div className="flex items-center gap-3">
                  <Button onClick={send} disabled={!draft.trim() || !target}>
                    Send DM
                  </Button>
                  {status && <span className="text-sm text-black/55">{status}</span>}
                </div>
                <p className="text-xs text-black/45">
                  Instagram only allows free-form replies within 24h of the
                  person&apos;s last message.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/** One thread. Keyed by conversation id so switching remounts. */
function Thread({
  conversationId,
  onLoaded,
}: {
  conversationId: string;
  onLoaded: (context: string, recipientId?: string) => void;
}) {
  const [messages, setMessages] = useState<Message[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ig/messages?conversationId=${encodeURIComponent(conversationId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list: Message[] = d.messages ?? [];
        setMessages(list);
        onLoaded(
          list
            .slice(-6)
            .map((m) => `@${m.from?.username}: ${m.text || "[attachment]"}`)
            .join("\n"),
          d.counterpart?.id,
        );
      })
      .catch(() => !cancelled && setMessages([]));
    return () => {
      cancelled = true;
    };
  }, [conversationId, onLoaded]);

  if (messages === null) return <Loading />;
  if (messages.length === 0) {
    return <p className="text-sm text-black/45">No messages in this thread.</p>;
  }

  return (
    <ul className="max-h-96 space-y-2 overflow-y-auto">
      {messages.map((m) => (
        <li
          key={m.id}
          className={`max-w-[85%] rounded-xl p-3 text-sm ${
            m.mine ? "ml-auto bg-brand/[0.08]" : "bg-black/[0.04]"
          }`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-medium">@{m.from?.username ?? "user"}</span>
            <span className="text-[11px] text-black/40">
              {m.createdAt?.slice(0, 16).replace("T", " ")}
            </span>
          </div>

          {m.text && <p className="mt-1 whitespace-pre-wrap">{m.text}</p>}

          {/* Meta serves DM media from signed CDN URLs that next/image cannot
              optimise, so these render as plain images. */}
          {m.attachments.map((a, i) =>
            a.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={a.url}
                alt="Attachment"
                className="mt-2 max-h-64 rounded-lg object-contain"
              />
            ) : a.kind === "video" ? (
              <video
                key={i}
                src={a.url}
                poster={a.poster}
                controls
                className="mt-2 max-h-64 rounded-lg"
              />
            ) : (
              <a
                key={i}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs underline"
              >
                {a.name ?? "Attachment"}
              </a>
            ),
          )}
        </li>
      ))}
    </ul>
  );
}
