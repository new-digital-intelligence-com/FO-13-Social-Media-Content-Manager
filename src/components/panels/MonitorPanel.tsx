"use client";

import { useEffect, useState } from "react";
import { AiAssist } from "../AiAssist";
import { Button, Card, Empty, ErrorNote, Loading, Note, inputClass } from "../ui";

type Flag = {
  reason: "issue" | "negative" | "question";
  commentId: string;
  text: string;
  username?: string;
  mediaId: string;
  caption?: string;
  permalink?: string;
};

type Data = {
  scanned?: { posts: number; comments: number };
  flagged?: Flag[];
  limitation?: string;
  note?: string;
  error?: string;
};

const REASONS = {
  issue: { label: "Needs attention", tone: "bg-red-50 text-red-700 ring-red-200" },
  negative: { label: "Negative", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  question: { label: "Question", tone: "bg-blue-50 text-blue-700 ring-blue-200" },
};

export function MonitorPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [suggestions, setSuggestions] = useState<{
    suggestions?: string;
    grounded?: boolean;
    analysed?: number;
    error?: string;
  } | null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ig/monitor")
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData({ error: "Network error." }));
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadSuggestions() {
    setLoadingIdeas(true);
    try {
      const res = await fetch("/api/ig/suggestions");
      setSuggestions(await res.json());
    } finally {
      setLoadingIdeas(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium">Content suggestions</h3>
            <p className="mt-1 text-sm text-black/55">
              Ideas grounded in what actually performed on this account.
            </p>
          </div>
          <Button variant="ghost" onClick={loadSuggestions} disabled={loadingIdeas}>
            {loadingIdeas ? "Analysing…" : "Suggest content"}
          </Button>
        </div>

        {suggestions?.error && <ErrorNote>{suggestions.error}</ErrorNote>}
        {suggestions?.suggestions && (
          <>
            <p className="text-xs text-black/45">
              {suggestions.grounded
                ? `Based on ${suggestions.analysed} of your posts, ranked by engagement.`
                : "No performance history yet — ideas are based on your configured topics."}
            </p>
            <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/[0.04] p-3 text-sm">
              {suggestions.suggestions}
            </pre>
          </>
        )}
      </Card>

      {!data ? (
        <Loading label="Scanning comments…" />
      ) : data.error ? (
        <ErrorNote>{data.error}</ErrorNote>
      ) : (
        <>
          <Note>{data.limitation}</Note>
          <p className="text-sm text-black/55">
            Scanned {data.scanned?.comments ?? 0} comments across{" "}
            {data.scanned?.posts ?? 0} recent posts.
          </p>

          {!data.flagged?.length ? (
            <Empty
              title="Nothing flagged"
              hint="Questions, negative sentiment and escalation keywords appear here as they arrive."
            />
          ) : (
            <div className="space-y-3">
              {data.flagged.map((flag) => (
                <FlagCard key={flag.commentId} flag={flag} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FlagCard({ flag }: { flag: Flag }) {
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const reason = REASONS[flag.reason];

  async function send() {
    setStatus("Posting…");
    const res = await fetch("/api/ig/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: flag.commentId, message: reply }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Replied." : data.error);
    if (res.ok) setReply("");
    setConfirming(false);
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${reason.tone}`}>
          {reason.label}
        </span>
        <span className="text-sm font-medium">@{flag.username ?? "user"}</span>
        {flag.permalink && (
          <a
            href={flag.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-black/45 underline"
          >
            view post
          </a>
        )}
      </div>

      <p className="text-sm">{flag.text}</p>
      {flag.caption && (
        <p className="text-xs text-black/45">On: {flag.caption}…</p>
      )}

      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
        placeholder="Your reply…"
        className={inputClass}
      />
      <AiAssist
        task="comment-reply"
        context={`Comment: ${flag.text}\nOn post: ${flag.caption ?? ""}`}
        placeholder="What should the reply say?"
        onInsert={setReply}
      />

      {confirming ? (
        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-medium">Post this public reply?</p>
          <div className="flex gap-2">
            <Button onClick={send}>Yes, post it</Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button onClick={() => setConfirming(true)} disabled={!reply.trim()}>
            Reply
          </Button>
          {status && <span className="text-sm text-black/55">{status}</span>}
        </div>
      )}
    </Card>
  );
}
