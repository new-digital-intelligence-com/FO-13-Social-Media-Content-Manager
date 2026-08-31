"use client";

import { useEffect, useRef, useState } from "react";
import { AiAssist } from "./AiAssist";
import {
  SIZES,
  TEMPLATES,
  renderTemplate,
  type Ratio,
  type Template,
  type TemplateValues,
} from "@/lib/templates";
import { Button, ErrorNote, inputClass } from "./ui";
import type { StagedFile } from "./MediaInput";

/**
 * Pick a template, edit the copy, drop in a photo, then export.
 * The canvas renders at true Instagram dimensions and exports JPEG, which goes
 * through the same /api/ig/upload path as any other file.
 */
export function TemplateStudio({
  ratio,
  onApply,
  onClose,
}: {
  ratio: Ratio;
  onApply: (file: StagedFile, previewUrl: string) => void;
  onClose: () => void;
}) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [values, setValues] = useState<TemplateValues>({ palette: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const usable = TEMPLATES.filter((t) => t.ratios.includes(ratio));

  useEffect(() => {
    if (!template || !canvasRef.current) return;
    renderTemplate(canvasRef.current, template, ratio, values, image);
  }, [template, ratio, values, image]);

  function pick(t: Template) {
    setTemplate(t);
    setValues({
      palette: 0,
      ...Object.fromEntries(t.fields.map((f) => [f.key, f.placeholder])),
    });
  }

  function loadImage(file: File) {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setImageName(file.name);
    };
    img.src = URL.createObjectURL(file);
  }

  async function apply() {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Could not render the design.");

      const file = new File([blob], `${template.id}-${ratio}.jpg`, {
        type: "image/jpeg",
      });
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/ig/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      onApply(data.file, URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!template) {
    return (
      <div className="space-y-4">
        <Header onClose={onClose} title="Choose a template" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {usable.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t)}
              className="overflow-hidden rounded-xl border border-black/10 bg-white text-left transition hover:border-brand/40 hover:shadow-sm"
            >
              <Thumb template={t} ratio={ratio} />
              <div className="p-3">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="mt-0.5 text-xs text-black/50">{t.blurb}</p>
                {t.photo !== "none" && (
                  <span className="mt-1.5 inline-block rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] text-black/55">
                    {t.photo === "required" ? "Needs a photo" : "Photo optional"}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const needsPhoto = template.photo === "required" && !image;

  return (
    <div className="space-y-4">
      <Header onClose={onClose} title={template.name}>
        <button
          onClick={() => setTemplate(null)}
          className="text-sm text-black/50 underline"
        >
          Change template
        </button>
      </Header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-black/10 bg-[#fafafa] p-4">
          <canvas
            ref={canvasRef}
            className="mx-auto block h-auto w-full max-w-sm rounded-lg shadow-sm"
          />
          <p className="mt-2 text-center text-xs text-black/45">
            {SIZES[ratio].label} · {SIZES[ratio].w}×{SIZES[ratio].h}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium">Colour</span>
            <div className="mt-2 flex gap-2">
              {template.palettes.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setValues((v) => ({ ...v, palette: i }))}
                  aria-label={`Palette ${i + 1}`}
                  className={`size-8 rounded-lg ring-2 transition ${
                    (values.palette ?? 0) === i ? "ring-brand" : "ring-transparent"
                  }`}
                  style={{
                    background:
                      p.length > 1
                        ? `linear-gradient(135deg, ${p.join(", ")})`
                        : p[0],
                  }}
                />
              ))}
            </div>
          </div>

          {template.photo !== "none" && (
            <div>
              <span className="text-sm font-medium">
                Photo{template.photo === "required" ? "" : " (optional)"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadImage(f);
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-1.5 w-full rounded-xl border border-dashed border-black/20 px-3 py-3 text-sm transition hover:border-black/40"
              >
                {imageName ?? "Choose a photo"}
              </button>
            </div>
          )}

          {template.fields.map((f) => (
            <label key={f.key} className="block space-y-1.5">
              <span className="text-sm font-medium">{f.label}</span>
              {f.max > 120 ? (
                <textarea
                  rows={4}
                  maxLength={f.max}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                  className={inputClass}
                />
              ) : (
                <input
                  maxLength={f.max}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                  className={inputClass}
                />
              )}
            </label>
          ))}

          <AiAssist
            task="ideas"
            context={[
              `Designing a ${SIZES[ratio].label} ${template.name} graphic.`,
              template.fields
                .map((f) => (values[f.key] ? `${f.label}: ${values[f.key]}` : null))
                .filter(Boolean)
                .join("\n"),
              image ? "A photo is placed in the design." : null,
            ]
              .filter(Boolean)
              .join("\n")}
            placeholder="What is the post about?"
            onInsert={(text) =>
              setValues((v) => ({ ...v, headline: text.split("\n")[0].slice(0, 90) }))
            }
          />

          <ErrorNote>{error}</ErrorNote>

          <Button onClick={apply} disabled={busy || needsPhoto} className="w-full">
            {busy ? "Preparing…" : "Use this design"}
          </Button>
          {needsPhoto && (
            <p className="text-xs text-black/45">This template needs a photo.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-medium">{title}</h3>
      <div className="flex items-center gap-3">
        {children}
        <button onClick={onClose} className="text-sm text-black/50 underline">
          Close
        </button>
      </div>
    </div>
  );
}

/** Small live-rendered preview for the gallery. */
function Thumb({ template, ratio }: { template: Template; ratio: Ratio }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    renderTemplate(
      ref.current,
      template,
      ratio,
      {
        palette: 0,
        ...Object.fromEntries(template.fields.map((f) => [f.key, f.placeholder])),
      },
      null,
    );
  }, [template, ratio]);

  return (
    <div className="bg-[#f2f2f3]">
      <canvas ref={ref} className="block h-auto w-full" />
    </div>
  );
}
