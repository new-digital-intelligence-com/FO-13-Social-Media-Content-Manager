"use client";

import { useState } from "react";
import { AiAssist } from "../AiAssist";
import { MediaInput, type MediaValue } from "../MediaInput";
import { TemplateStudio } from "../TemplateStudio";
import type { Ratio } from "@/lib/templates";
import { Button, Card, ErrorNote, Field, Note, inputClass } from "../ui";

type Kind = "IMAGE" | "REELS" | "STORIES" | "CAROUSEL";

function hasMedia(value: MediaValue) {
  return Boolean(value.file || value.url?.trim());
}

/** MediaValue -> the url/file fields the publish route expects. */
function mediaPayload(value: MediaValue, asVideo: boolean) {
  if (value.file) {
    const isVideo = asVideo || value.file.mimetype.startsWith("video/");
    return isVideo ? { videoFile: value.file } : { imageFile: value.file };
  }
  if (!value.url?.trim()) return {};
  return asVideo ? { videoUrl: value.url } : { imageUrl: value.url };
}

const KINDS: { id: Kind; label: string; icon: string; hint: string }[] = [
  { id: "IMAGE", label: "Photo", icon: "🖼", hint: "Single image post" },
  { id: "REELS", label: "Reel", icon: "🎬", hint: "Vertical video" },
  { id: "STORIES", label: "Story", icon: "⚡", hint: "Expires in 24h" },
  { id: "CAROUSEL", label: "Carousel", icon: "🎞", hint: "2–10 slides" },
];

export function ComposePanel() {
  const [kind, setKind] = useState<Kind>("IMAGE");
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<MediaValue>({});
  const [cover, setCover] = useState<MediaValue>({});
  const [altText, setAltText] = useState("");
  const [shareToFeed, setShareToFeed] = useState(true);
  const [slides, setSlides] = useState<MediaValue[]>([{}, {}]);
  const [script, setScript] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [studioFor, setStudioFor] = useState<number | "main" | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [thumbOffset, setThumbOffset] = useState("");
  const [audioName, setAudioName] = useState("");
  const [userTags, setUserTags] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const needsVideo = kind === "REELS";

  /** Stories are 9:16; feed photos default to 4:5, carousels to square. */
  const ratio: Ratio =
    kind === "STORIES" ? "story" : kind === "CAROUSEL" ? "square" : "portrait";

  /** "user,0.5,0.5" per line -> Instagram's user_tags shape. */
  function parsedTags() {
    return userTags
      .split("\n")
      .map((line) => line.split(",").map((p) => p.trim()))
      .filter(([u]) => u)
      .map(([username, x, y]) => ({
        username: username.replace(/^@/, ""),
        ...(x && y ? { x: Number(x), y: Number(y) } : {}),
      }));
  }

  async function publish() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ig/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          caption,
          ...mediaPayload(media, needsVideo),
          coverUrl: cover.url || undefined,
          altText: altText || undefined,
          shareToFeed,
          locationId: locationId || undefined,
          thumbOffset: thumbOffset ? Number(thumbOffset) : undefined,
          audioName: audioName || undefined,
          userTags: userTags.trim() ? parsedTags() : undefined,
          children:
            kind === "CAROUSEL"
              ? slides.filter(hasMedia).map((s) => mediaPayload(s, false))
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else setResult(`Published. Container ${data.creationId}.`);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const ready =
    kind === "CAROUSEL" ? slides.filter(hasMedia).length >= 2 : hasMedia(media);

  /** Schedule on Zernio instead of publishing now. A time is the commitment. */
  async function addToQueue() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ig/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "instagram",
          kind,
          caption,
          ...mediaPayload(media, needsVideo),
          publishAt: publishAt ? new Date(publishAt).toISOString() : null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          children:
            kind === "CAROUSEL"
              ? slides.filter(hasMedia).map((s) => mediaPayload(s, false))
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else
        setResult(
          publishAt
            ? `Scheduled for ${new Date(publishAt).toLocaleString()}. It will publish automatically — you do not need to do anything else.`
            : "Saved as a draft. It has no date, so it will not publish until you set one in the Queue tab.",
        );
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (studioFor !== null) {
    return (
      <Card>
        <TemplateStudio
          ratio={ratio}
          onClose={() => setStudioFor(null)}
          onApply={(file, previewUrl) => {
            const value = { file, previewUrl, fileName: "Design" };
            if (studioFor === "main") setMedia(value);
            else setSlides(slides.map((s, j) => (j === studioFor ? value : s)));
            setStudioFor(null);
          }}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                kind === k.id
                  ? "border-brand bg-brand text-white"
                  : "border-black/12 hover:border-brand/40 hover:bg-brand/[0.03]"
              }`}
            >
              <span className="text-base">{k.icon}</span>
              <span className="mt-1 block text-sm font-medium">{k.label}</span>
              <span
                className={`block text-xs ${kind === k.id ? "text-white/70" : "text-black/45"}`}
              >
                {k.hint}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <Note>
          Upload a file and it is hosted on a temporary public URL for
          Instagram to fetch. Pasting a URL works too, but it must be publicly
          reachable — a localhost link will fail.
        </Note>

        {kind === "CAROUSEL" ? (
          <div className="space-y-4">
            <span className="text-sm font-medium">Slides (2–10)</span>
            {slides.map((slide, i) => (
              <div key={i} className="rounded-xl border border-black/10 bg-black/[0.015] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-black/50">Slide {i + 1}</span>
                  {slides.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setSlides(slides.filter((_, j) => j !== i))}
                      className="text-xs text-black/50 underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <MediaInput
                  label=""
                  accept="image/*,video/*"
                  value={slide}
                  onChange={(v) => setSlides(slides.map((s, j) => (i === j ? v : s)))}
                />
                <button
                  type="button"
                  onClick={() => setStudioFor(i)}
                  className="mt-2 text-sm font-medium text-violet-600 hover:underline"
                >
                  🎨 Design this slide from a template
                </button>
              </div>
            ))}
            {slides.length < 10 && (
              <Button variant="ghost" onClick={() => setSlides([...slides, {}])}>
                Add slide
              </Button>
            )}
          </div>
        ) : needsVideo ? (
          <>
            <MediaInput
              label="Video"
              accept="video/*"
              value={media}
              onChange={setMedia}
              hint="Upload an MP4, or paste a public URL."
            />
            <MediaInput
              label="Cover image (optional)"
              accept="image/*"
              value={cover}
              onChange={setCover}
              hint="Uploads are hosted and passed as a URL, which is the only form Instagram accepts for a Reel cover. Or set a cover frame below to use a moment from the video."
            />
            {media.publicId && media.resourceType === "video" && (
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/media", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      publicId: media.publicId,
                      atSeconds: Math.round(Number(thumbOffset || 0) / 1000),
                    }),
                  });
                  const data = await res.json();
                  if (data.url) setCover({ url: data.url, fileName: "Frame from video" });
                }}
                className="text-sm font-medium text-brand-ink hover:underline"
              >
                Use a frame from the uploaded video as the cover
              </button>
            )}

            <Field
              label="Cover frame (ms)"
              hint="Used when no cover URL is given — picks that moment from the video. 0 is the first frame."
            >
              <input
                value={thumbOffset}
                onChange={(e) => setThumbOffset(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shareToFeed}
                onChange={(e) => setShareToFeed(e.target.checked)}
              />
              Also share to the main feed
            </label>
          </>
        ) : (
          <>
            <MediaInput
              label={kind === "STORIES" ? "Story media" : "Photo"}
              accept={kind === "STORIES" ? "image/*,video/*" : "image/*"}
              value={media}
              onChange={setMedia}
              hint="Upload a file, or paste a public URL."
            />
            <button
              type="button"
              onClick={() => setStudioFor("main")}
              className="text-sm font-medium text-violet-600 hover:underline"
            >
              🎨 Design one from a template
            </button>
            {kind === "IMAGE" && (
              <Field label="Alt text (optional)" hint="Max 1,000 characters. Images only.">
                <input
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}
          </>
        )}

        {kind !== "STORIES" && (
          <Field
            label="Caption"
            hint={`${caption.length}/2,200 characters · max 30 hashtags`}
          >
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              placeholder="Write your caption…"
              className={inputClass}
            />
          </Field>
        )}

        <div className="rounded-xl border border-black/10">
          <button
            type="button"
            onClick={() => setAdvanced(!advanced)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          >
            Advanced options
            <span className="text-black/40">{advanced ? "−" : "+"}</span>
          </button>
          {advanced && (
            <div className="space-y-4 border-t border-black/10 p-4">
              <Field
                label="Tag accounts"
                hint={
                  kind === "REELS"
                    ? "One @username per line. Reels do not accept coordinates."
                    : "One per line as username,x,y — coordinates 0.0–1.0 from top-left, required for photos."
                }
              >
                <textarea
                  value={userTags}
                  onChange={(e) => setUserTags(e.target.value)}
                  rows={3}
                  placeholder={kind === "REELS" ? "@friend" : "@friend,0.5,0.5"}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Location ID"
                hint="A Facebook Page ID with latitude/longitude data."
              >
                <input
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className={inputClass}
                />
              </Field>
              {needsVideo && (
                <Field label="Audio name" hint="Defaults to 'Original Audio'.">
                  <input
                    value={audioName}
                    onChange={(e) => setAudioName(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <AiAssist
            task="caption"
            context={[
              `Post type: ${kind}.`,
              script ? `The reel script:\n${script.slice(0, 1200)}` : null,
              altText ? `Alt text describing the image: ${altText}` : null,
              userTags.trim() ? `Accounts tagged: ${userTags}` : null,
            ]
              .filter(Boolean)
              .join("\n")}
            placeholder="What is this post about?"
            onInsert={setCaption}
          />
          <AiAssist
            task="hashtags"
            context={[
              caption ? `The caption:\n${caption}` : null,
              `Post type: ${kind}.`,
            ]
              .filter(Boolean)
              .join("\n")}
            placeholder="Topic and audience?"
            onInsert={(t) => setCaption((c) => `${c}\n\n${t}`.trim())}
          />
        </div>
      </Card>

      {kind === "REELS" && (
        <Card className="space-y-3">
          <h3 className="font-medium">Reel script</h3>
          <p className="text-sm text-black/50">
            Plan the shoot. This is for you — it is not sent to Instagram.
          </p>
          <AiAssist
            task="reel-script"
            context={[
              caption ? `The caption for this reel: ${caption}` : null,
              hasMedia(media) ? "A video is already attached." : null,
              thumbOffset ? `Cover frame at ${thumbOffset}ms.` : null,
            ]
              .filter(Boolean)
              .join("\n")}
            placeholder="What is the reel about? Who is it for?"
            onInsert={setScript}
          />
          {script && (
            <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/[0.04] p-3 text-sm">
              {script}
            </pre>
          )}
        </Card>
      )}

      <Card className="space-y-3">
        <ErrorNote>{error}</ErrorNote>
        {result && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
            {result}
          </p>
        )}

        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-black/[0.03] p-4">
          <label className="space-y-1.5">
            <span className="block text-sm font-medium">Schedule for</span>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </label>
          <Button variant="ghost" onClick={addToQueue} disabled={!ready || busy}>
            {publishAt ? "Schedule it" : "Save as draft"}
          </Button>
          <p className="w-full text-xs text-black/45">
            {publishAt ? (
              <>
                <strong>This will publish on its own</strong> at the time above (
                {Intl.DateTimeFormat().resolvedOptions().timeZone}). Zernio holds
                it and fires it — the app does not need to be running. Leave the
                date empty to save a draft instead.
              </>
            ) : (
              <>
                No date set, so this saves as a <strong>draft</strong> and will
                not publish. Pick a time above to schedule it.
              </>
            )}
          </p>
        </div>

        {confirming ? (
          <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-medium">
              Publish this {KINDS.find((k) => k.id === kind)?.label.toLowerCase()} now?
            </p>
            <p className="text-sm text-black/60">
              It goes live on Instagram <strong>right now</strong> — visible to
              your followers immediately, and there is no unsend. To publish
              later instead, cancel and set a time under &ldquo;Schedule
              for&rdquo; above.
            </p>
            <div className="flex gap-2">
              <Button onClick={publish} disabled={busy}>
                {busy ? "Publishing…" : "Yes, publish"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)} disabled={!ready || busy}>
            Publish now
          </Button>
        )}
        {!ready && (
          <p className="text-xs text-black/45">
            {kind === "CAROUSEL"
              ? "Add at least 2 slides."
              : "Upload a file or paste a URL to continue."}
          </p>
        )}
      </Card>
    </div>
  );
}
