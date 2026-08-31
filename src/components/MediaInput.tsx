"use client";

import { useRef, useState } from "react";
import { ErrorNote, inputClass } from "./ui";

export type StagedFile = { name: string; mimetype: string; s3key: string };

export type MediaValue = {
  /** Public URL — from a paste, or from hosting an upload. */
  url?: string;
  file?: StagedFile;
  /** Local object URL for preview only; never sent. */
  previewUrl?: string;
  fileName?: string;
  /** Set when the file was hosted, so it can be deleted or framed later. */
  publicId?: string;
  resourceType?: "image" | "video" | "raw";
};

/**
 * Either upload a file (staged through Composio, which hosts it on a temporary
 * public URL) or paste a public URL. Upload is the default because a local
 * file has no URL Meta could fetch.
 */
export function MediaInput({
  accept = "image/*",
  value,
  onChange,
  label,
  hint,
  urlOnly = false,
}: {
  accept?: string;
  value: MediaValue;
  onChange: (value: MediaValue) => void;
  label: string;
  hint?: string;
  /**
   * Some fields only accept a public URL -- an Instagram Reel cover has a
   * `cover_url` parameter and no file equivalent. Offering an upload there
   * would silently drop the file, so the toggle is hidden instead.
   */
  urlOnly?: boolean;
}) {
  const [mode, setMode] = useState<"upload" | "url">(urlOnly ? "url" : "upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Uploads are hosted first so every field ends up with a real public URL.
   * That is what the platforms fetch, and it is the only thing URL-only fields
   * such as a Reel cover can use at all.
   */
  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/media", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.code === "CLOUDINARY_NOT_CONFIGURED"
            ? `${data.error} Until then, paste a public URL instead.`
            : data.error,
        );
        return;
      }
      onChange({
        url: data.url,
        publicId: data.publicId,
        resourceType: data.resourceType,
        fileName: data.name,
        previewUrl: URL.createObjectURL(file),
      });
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const isVideo = Boolean(value.previewUrl) && accept.includes("video");

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        {label ? <span className="text-sm font-medium">{label}</span> : <span />}
        {urlOnly ? (
          <span className="rounded-lg bg-black/[0.05] px-2.5 py-1 text-xs font-medium text-black/50">
            URL only
          </span>
        ) : (
          <div className="flex gap-1 rounded-lg bg-black/[0.05] p-0.5">
            {(["upload", "url"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  mode === m ? "bg-white text-brand-ink shadow-sm" : "text-black/55"
                }`}
              >
                {m === "upload" ? "Upload" : "URL"}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === "upload" ? (
        <div className="space-y-2">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) upload(file);
            }}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-xl border border-dashed border-black/20 px-4 py-6 text-center transition hover:border-brand/50 hover:bg-brand/[0.03]"
          >
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }}
            />
            {busy ? (
              <p className="text-sm">Uploading…</p>
            ) : value.fileName ? (
              <p className="text-sm font-medium">{value.fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium">Click or drop a file</p>
                <p className="mt-0.5 text-xs text-black/45">
                  {accept.includes("video") ? "MP4 up to 100 MB" : "JPEG up to 8 MB"}
                </p>
              </>
            )}
          </div>

          {value.previewUrl && (
            <div className="flex items-center gap-3">
              {isVideo ? (
                <video
                  src={value.previewUrl}
                  className="h-20 w-20 rounded-lg object-cover"
                  muted
                />
              ) : (
                /* Local blob preview: next/image cannot optimize object URLs. */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={value.previewUrl}
                  alt="Preview"
                  className="h-20 w-20 rounded-lg object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => onChange({})}
                className="text-sm text-black/50 underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <input
          value={value.url ?? ""}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder={
            accept.includes("video") ? "https://…/video.mp4" : "https://…/photo.jpg"
          }
          className={inputClass}
        />
      )}

      {hint && <p className="text-xs text-black/45">{hint}</p>}
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}
