"use client";

import { useState } from "react";
import { Button, Card, ErrorNote, Field, Note, inputClass } from "../ui";

const TASKS = [
  { id: "summary", label: "Summary", blurb: "Overview + takeaways" },
  { id: "chapters", label: "Chapters", blurb: "Timestamped markers" },
  { id: "description", label: "Description", blurb: "Full video description" },
  { id: "titles", label: "Titles", blurb: "5 options under 60 chars" },
  { id: "tags", label: "Tags", blurb: "10–15 suggestions" },
  { id: "repurpose", label: "Repurpose", blurb: "Instagram + X + Reel" },
] as const;

/**
 * The transcript-driven workspace. Every task here reads what the video
 * actually says rather than guessing from its title.
 */
export function YtStudio({ videoId: initialId }: { videoId?: string }) {
  const [videoId, setVideoId] = useState(initialId ?? "");
  const [task, setTask] = useState<(typeof TASKS)[number]["id"]>("summary");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<{ text: string; usedTranscript: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/yt/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, videoId: videoId.trim() || undefined, prompt }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else setResult({ text: data.text, usedTranscript: data.usedTranscript });
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div>
          <h3 className="font-medium">AI studio</h3>
          <p className="mt-1 text-sm text-black/55">
            Loads the video&apos;s caption transcript, then works from what was
            actually said — not the title.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TASKS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTask(t.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                task === t.id
                  ? "border-brand bg-brand text-white"
                  : "border-black/12 hover:border-brand/40 hover:bg-brand/[0.03]"
              }`}
            >
              <span className="block text-sm font-medium">{t.label}</span>
              <span
                className={`block text-[11px] ${task === t.id ? "text-white/70" : "text-black/45"}`}
              >
                {t.blurb}
              </span>
            </button>
          ))}
        </div>

        <Field label="Video ID" hint="From the watch URL, e.g. dQw4w9WgXcQ">
          <input
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Extra direction (optional)">
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Audience, tone, angle…"
            className={inputClass}
          />
        </Field>

        <Button onClick={run} disabled={busy || !videoId.trim()}>
          {busy ? "Reading the transcript…" : `Generate ${task}`}
        </Button>

        <ErrorNote>{error}</ErrorNote>

        {result && (
          <div className="space-y-2">
            {!result.usedTranscript && (
              <Note>
                No caption track was available, so this is based on the
                video&apos;s metadata rather than what was said. Treat it as a
                weaker draft.
              </Note>
            )}
            <pre className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/[0.04] p-4 text-sm">
              {result.text}
            </pre>
            <button
              onClick={() => navigator.clipboard?.writeText(result.text)}
              className="text-sm text-brand-ink underline"
            >
              Copy
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
