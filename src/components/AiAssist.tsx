"use client";

import { useState } from "react";
import { Button, ErrorNote, inputClass } from "./ui";

type Task =
  | "caption"
  | "hashtags"
  | "reel-script"
  | "comment-reply"
  | "dm-reply"
  | "ideas"
  | "bio";

/**
 * Writing help attached to a manual composer. Calls the tool-free /api/assist,
 * so it is cheap and never touches the user's Instagram account.
 */
export function AiAssist({
  task,
  context,
  platform,
  placeholder,
  onInsert,
}: {
  task: Task;
  context?: string;
  /** Retargets the task's rules; without it the prompt stays Instagram-shaped. */
  platform?: "instagram" | "youtube" | "x";
  placeholder?: string;
  onInsert: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult("");
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, prompt, context, platform }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else setResult(data.text);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-brand-ink hover:underline"
      >
        ✨ Ask AI for help
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand/25 bg-brand/[0.04] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">AI assist</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-black/45"
        >
          Close
        </button>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder ?? "What should it be about?"}
        rows={2}
        className={inputClass}
      />
      <Button type="button" onClick={run} disabled={busy}>
        {busy ? "Thinking…" : "Generate"}
      </Button>

      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-2">
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-sm ring-1 ring-black/10">
            {result}
          </pre>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onInsert(result)}>
              Use this
            </Button>
            <Button type="button" variant="ghost" onClick={run} disabled={busy}>
              Regenerate
            </Button>
          </div>
          <p className="text-xs text-black/45">
            AI drafts only. Nothing is posted until you publish it yourself.
          </p>
        </div>
      )}
    </div>
  );
}
