"use client";

import { useEffect, useState } from "react";
import { AiAssist } from "../AiAssist";
import {
  Button,
  Card,
  Empty,
  ErrorNote,
  Field,
  Loading,
  Note,
  Stat,
  inputClass,
} from "../ui";

type Channel = {
  snippet?: { title?: string; description?: string; customUrl?: string };
  statistics?: Record<string, string>;
  id?: string;
};

function first<T>(data: unknown): T | undefined {
  if (Array.isArray(data)) return data[0] as T;
  const items = (data as { items?: T[] })?.items;
  return Array.isArray(items) ? items[0] : (data as T);
}

export function YtOverview() {
  const [data, setData] = useState<{ channel?: unknown; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/yt/channel")
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData({ error: "Network error." }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <Loading label="Loading channel…" />;
  if (data.error) return <ErrorNote>{data.error}</ErrorNote>;

  const ch = first<Channel>(data.channel);
  const s = ch?.statistics ?? {};

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-lg font-semibold">{ch?.snippet?.title ?? "Channel"}</h2>
        {ch?.snippet?.customUrl && (
          <p className="text-sm text-black/55">{ch.snippet.customUrl}</p>
        )}
        {ch?.snippet?.description && (
          <p className="mt-2 line-clamp-3 text-sm">{ch.snippet.description}</p>
        )}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-black/10 pt-5">
          <Stat label="Subscribers" value={s.subscriberCount ?? "—"} />
          <Stat label="Videos" value={s.videoCount ?? "—"} />
          <Stat label="Views" value={s.viewCount ?? "—"} />
        </div>
      </Card>
      <Note>
        Watch time, retention and revenue come from the YouTube Analytics API,
        which is a different API and not available here. These are view, like and
        comment counts only.
      </Note>
    </div>
  );
}

type Video = {
  id?: string | { videoId?: string };
  snippet?: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> };
  statistics?: Record<string, string>;
};

export function YtVideos({ onStudio }: { onStudio: (id: string) => void }) {
  const [data, setData] = useState<{ videos?: unknown; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/yt/videos?max=25")
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData({ error: "Network error." }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <Loading label="Loading videos…" />;
  if (data.error) return <ErrorNote>{data.error}</ErrorNote>;

  const raw = data.videos;
  const list: Video[] = Array.isArray(raw)
    ? raw
    : ((raw as { items?: Video[] })?.items ?? []);

  if (list.length === 0) {
    return <Empty title="No videos" hint="This channel has no uploads yet." />;
  }

  return (
    <div className="space-y-3">
      {list.map((v, i) => {
        const id = typeof v.id === "string" ? v.id : v.id?.videoId;
        return (
          <Card key={id ?? i} className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{v.snippet?.title ?? "Untitled"}</p>
              <p className="mt-0.5 text-xs text-black/45">
                {v.snippet?.publishedAt?.slice(0, 10)}
                {v.statistics?.viewCount && ` · ${v.statistics.viewCount} views`}
                {id && ` · ${id}`}
              </p>
            </div>
            {id && (
              <Button variant="ghost" onClick={() => onStudio(id)}>
                Open in AI studio
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function YtUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacyStatus, setPrivacy] = useState("private");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState<"video" | "short">("video");
  /** Read from the file itself — YouTube decides from these, not from us. */
  const [meta, setMeta] = useState<{
    duration: number;
    width: number;
    height: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "video");
      body.append("title", title);
      // #Shorts in the description is the only signal the API lets us send;
      // the file's own duration and shape do the actual deciding.
      body.append(
        "description",
        uploadKind === "short" && !/#shorts/i.test(description)
          ? `${description}\n\n#Shorts`.trim()
          : description,
      );
      body.append("tags", tags);
      body.append("privacyStatus", privacyStatus);
      const res = await fetch("/api/yt/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      let thumbNote = "";
      if (thumbnail && data.videoId) {
        // The thumbnail needs the video's id, so it can only be set after the
        // upload returns. A failure here does not undo the video.
        const tb = new FormData();
        tb.append("file", thumbnail);
        tb.append("videoId", data.videoId);
        const tRes = await fetch("/api/yt/upload", { method: "PATCH", body: tb });
        const tData = await tRes.json();
        thumbNote = tRes.ok
          ? " Custom thumbnail set."
          : ` (Thumbnail not applied — ${tData.error ?? "unknown error"} You can add one in Studio.)`;
      } else if (thumbnail && !data.videoId) {
        thumbNote = " The thumbnail was skipped because YouTube returned no video id.";
      }

      // Lead with the outcome that matters. A failed thumbnail previously read
      // as though the whole upload had failed.
      setResult(
        (data.videoId
          ? `Video uploaded as ${privacyStatus}: youtube.com/watch?v=${data.videoId}`
          : `Video uploaded as ${privacyStatus}.`) +
          thumbNote +
          " Videos of 60 seconds or less appear under Shorts in Studio, not Videos.",
      );
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Card className="space-y-4">
      <Note>
        <strong>This uploads immediately.</strong> There is no scheduling here —
        the video goes to your channel as soon as you confirm, at the privacy you
        pick below.
        <br />
        Each upload costs roughly 1,600 quota units of a default 10,000 per day —
        about six uploads, and the quota resets daily on Pacific time. Defaults
        to private so you can review before anyone is notified.
      </Note>

      <label className="block cursor-pointer rounded-xl border border-dashed border-black/20 px-4 py-6 text-center transition hover:border-brand/50 hover:bg-brand/[0.03]">
        <input
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            setError(null);
            if (picked && !picked.type.startsWith("video/")) {
              setError(
                `"${picked.name}" is ${picked.type || "an unknown type"}, not a video.`,
              );
              setFile(null);
              return;
            }
            if (picked && picked.size === 0) {
              setError("That file is empty (0 bytes).");
              setFile(null);
              return;
            }
            setFile(picked);
            setMeta(null);
            if (picked) {
              // Duration and aspect decide Short vs video, so read them rather
              // than guessing from the filename.
              const el = document.createElement("video");
              el.preload = "metadata";
              el.onloadedmetadata = () => {
                setMeta({
                  duration: el.duration,
                  width: el.videoWidth,
                  height: el.videoHeight,
                });
                URL.revokeObjectURL(el.src);
              };
              el.src = URL.createObjectURL(picked);
            }
          }}
        />
        {file ? (
          <span className="text-sm font-medium">
            {file.name}
            <span className="ml-2 font-normal text-black/45">
              {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type}
            </span>
          </span>
        ) : (
          <>
            <span className="block text-sm font-medium">Choose a video</span>
            <span className="mt-0.5 block text-xs text-black/45">MP4 or MOV</span>
          </>
        )}
      </label>

      <Field
        label="Publish as"
        hint="YouTube decides this from the file itself — there is no API setting for it."
      >
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["video", "Regular video", "Any length or shape"],
              ["short", "Short", "Under 3 min, vertical"],
            ] as const
          ).map(([id, label, hint]) => (
            <button
              key={id}
              type="button"
              onClick={() => setUploadKind(id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                uploadKind === id
                  ? "border-brand bg-brand text-white"
                  : "border-black/12 hover:border-brand/40 hover:bg-brand/[0.03]"
              }`}
            >
              <span className="block text-sm font-medium">{label}</span>
              <span
                className={`block text-xs ${uploadKind === id ? "text-white/70" : "text-black/45"}`}
              >
                {hint}
              </span>
            </button>
          ))}
        </div>
      </Field>

      {uploadKind === "short" && (
        <p className="rounded-xl bg-brand/[0.05] px-3.5 py-2.5 text-xs text-black/70">
          {/#shorts/i.test(description) ? (
            <>
              Your description already contains <code>#Shorts</code>, so nothing
              will be added.
            </>
          ) : (
            <>
              <code>#Shorts</code> will be added to the end of your description on
              upload. It is a hint to YouTube — the file&apos;s length and shape
              are what actually decide.
            </>
          )}
        </p>
      )}

      {meta && <ShortsVerdict meta={meta} intent={uploadKind} />}

      <Field label="Title" hint={`${title.length}/100 — under 60 reads best in search`}>
        <input
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        label="Description"
        hint={
          uploadKind === "short" && !/#shorts/i.test(description)
            ? "First two lines show above the fold. Max 5,000. #Shorts will be appended on upload."
            : "First two lines show above the fold. Max 5,000."
        }
      >
        <textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Tags" hint="Comma separated, 10–15.">
        <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} />
      </Field>

      <Field
        label="Custom thumbnail (optional)"
        hint="JPG or PNG under 2 MB, 1280×720 works best. Requires a verified YouTube channel."
      >
        <label className="block cursor-pointer rounded-xl border border-dashed border-black/20 px-4 py-4 text-center transition hover:border-brand/50 hover:bg-brand/[0.03]">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            hidden
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              setError(null);
              if (picked && !picked.type.startsWith("image/")) {
                setError(`"${picked.name}" is not an image.`);
                setThumbnail(null);
                return;
              }
              // YouTube rejects anything over 2 MB outright.
              if (picked && picked.size > 2 * 1024 * 1024) {
                setError(
                  `Thumbnail is ${(picked.size / 1024 / 1024).toFixed(1)} MB; YouTube's limit is 2 MB.`,
                );
                setThumbnail(null);
                return;
              }
              setThumbnail(picked);
            }}
          />
          {thumbnail ? (
            <span className="text-sm font-medium">
              {thumbnail.name}
              <span className="ml-2 font-normal text-black/45">
                {(thumbnail.size / 1024).toFixed(0)} KB
              </span>
            </span>
          ) : (
            <span className="text-sm text-black/55">
              Choose a thumbnail image
            </span>
          )}
        </label>
        {thumbnail && (
          <button
            type="button"
            onClick={() => setThumbnail(null)}
            className="mt-1 text-xs text-black/50 underline"
          >
            Remove thumbnail
          </button>
        )}
      </Field>

      <Field label="Privacy">
        <select
          value={privacyStatus}
          onChange={(e) => setPrivacy(e.target.value)}
          className={inputClass}
        >
          <option value="private">Private — only you can see it</option>
          <option value="unlisted">Unlisted — anyone with the link, no notification</option>
          <option value="public">Public — live on the channel, notifies subscribers</option>
        </select>
      </Field>

      <AiAssist
        task="caption"
        context={[
          "Writing a YouTube description.",
          title ? `Title: ${title}` : null,
          tags ? `Tags: ${tags}` : null,
          description ? `Current draft:\n${description}` : null,
        ]
          .filter(Boolean)
          .join("\n")}
        placeholder="What is the video about?"
        onInsert={setDescription}
      />

      <ErrorNote>{error}</ErrorNote>
      {result && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          {result}
        </p>
      )}

      {confirming ? (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium">
            Upload &ldquo;{title}&rdquo; to your channel as {privacyStatus}, now?
          </p>
          <p className="text-sm text-black/60">
            {privacyStatus === "public"
              ? "It goes live immediately and notifies your subscribers. The notification cannot be recalled, even if you delete the video afterwards."
              : privacyStatus === "unlisted"
                ? "It will not appear on your channel or notify anyone, but anyone with the link can watch it."
                : "Only you will be able to see it. You can make it public later from the Videos tab."}
          </p>
          <p className="text-xs text-black/50">
            This spends about 1,600 quota units whichever privacy you choose.
          </p>
          <div className="flex gap-2">
            <Button onClick={upload} disabled={busy}>
              {busy ? "Uploading…" : "Yes, upload"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setConfirming(true)}
          disabled={!file || !title.trim() || !description.trim() || busy}
        >
          Upload now
        </Button>
      )}
    </Card>
  );
}

export function YtComments() {
  const [videoId, setVideoId] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    const url = videoId.trim()
      ? `/api/yt/comments?videoId=${encodeURIComponent(videoId.trim())}`
      : "/api/yt/comments";
    const res = await fetch(url);
    setData(await res.json());
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <Field label="Video ID (blank = whole channel)">
          <input
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Button onClick={load} disabled={busy}>
          {busy ? "Loading…" : "Load comments"}
        </Button>
      </Card>

      {data?.error ? (
        <ErrorNote>{String(data.error)}</ErrorNote>
      ) : data ? (
        <Card>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(data.threads ?? data, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}

export function YtPlaylists() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const load = () =>
    fetch("/api/yt/playlists")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/yt/playlists")
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function create() {
    setStatus("Creating…");
    const res = await fetch("/api/yt/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title: name, privacyStatus: "private" }),
    });
    const d = await res.json();
    setStatus(res.ok ? "Created (private)." : d.error);
    if (res.ok) {
      setName("");
      load();
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="font-medium">Create a playlist</h3>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist title"
            className={inputClass}
          />
          <Button onClick={create} disabled={!name.trim()}>
            Create
          </Button>
        </div>
        {status && <p className="text-sm text-black/55">{status}</p>}
      </Card>

      {data?.error ? (
        <ErrorNote>{String(data.error)}</ErrorNote>
      ) : data ? (
        <Card>
          <h3 className="mb-2 font-medium">Your playlists</h3>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(data.playlists ?? data, null, 2)}
          </pre>
        </Card>
      ) : (
        <Loading />
      )}
    </div>
  );
}

export function YtSearch() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(url: string) {
    setBusy(true);
    setData(null);
    const res = await fetch(url);
    setData(await res.json());
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <Note>
          Each search costs ~100 quota units against a daily 10,000 — roughly a
          hundred searches. Use the Videos tab to read your own uploads instead.
        </Note>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search YouTube…"
            className={inputClass}
          />
          <Button
            onClick={() => run(`/api/yt/search?q=${encodeURIComponent(q)}`)}
            disabled={busy || !q.trim()}
          >
            Search
          </Button>
        </div>
        <Button variant="ghost" onClick={() => run("/api/yt/search?popular=1")}>
          Show trending instead
        </Button>
      </Card>

      {data?.error ? (
        <ErrorNote>{String(data.error)}</ErrorNote>
      ) : data ? (
        <Card>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(data.results ?? data.popular ?? data, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * What YouTube will actually do with this file.
 *
 * Shorts classification is automatic: roughly 3 minutes or less, and taller
 * than it is wide. Saying so up front avoids uploading a landscape clip and
 * then hunting for it in the wrong Studio tab.
 */
function ShortsVerdict({
  meta,
  intent,
}: {
  meta: { duration: number; width: number; height: number };
  intent: "video" | "short";
}) {
  const vertical = meta.height >= meta.width;
  const shortEnough = meta.duration > 0 && meta.duration <= 180;
  const willBeShort = vertical && shortEnough;
  const mins = Math.floor(meta.duration / 60);
  const secs = Math.round(meta.duration % 60);
  const length = mins ? `${mins}m ${secs}s` : `${secs}s`;

  const detail = `${length} · ${meta.width}×${meta.height} · ${vertical ? "vertical" : "landscape"}`;

  if (intent === "short" && !willBeShort) {
    return (
      <ErrorNote>
        This file will publish as a <strong>regular video</strong>, not a Short —
        it is {detail}. Shorts must be 3 minutes or less and vertical. The upload
        will still work; it just will not appear under Shorts.
      </ErrorNote>
    );
  }
  if (intent === "video" && willBeShort) {
    return (
      <Note>
        Heads up: this file is {detail}, so YouTube will file it under{" "}
        <strong>Shorts</strong> rather than Videos, whatever you pick here.
      </Note>
    );
  }
  return (
    <p className="text-xs text-black/50">
      {detail} — will publish as {willBeShort ? "a Short" : "a regular video"}.
    </p>
  );
}
