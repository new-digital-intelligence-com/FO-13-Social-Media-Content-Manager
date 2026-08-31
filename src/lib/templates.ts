/**
 * Canvas-rendered post templates.
 *
 * Instagram needs a real image file, so a "template" here is a pure draw
 * function onto a canvas at exact Instagram dimensions. The result is exported
 * as JPEG and pushed through the normal upload path, so nothing new is needed
 * server-side.
 */

export type Ratio = "square" | "portrait" | "story";

export const SIZES: Record<Ratio, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "1:1 Square" },
  portrait: { w: 1080, h: 1350, label: "4:5 Portrait" },
  story: { w: 1080, h: 1920, label: "9:16 Story" },
};

export type FieldKey = "headline" | "subtext" | "badge";

export type TemplateValues = Partial<Record<FieldKey, string>> & {
  palette?: number;
};

export type Template = {
  id: string;
  name: string;
  blurb: string;
  ratios: Ratio[];
  photo: "none" | "optional" | "required";
  fields: { key: FieldKey; label: string; placeholder: string; max: number }[];
  palettes: string[][];
  draw: (c: DrawContext) => void;
};

export type DrawContext = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  values: TemplateValues;
  image: CanvasImageSource | null;
  palette: string[];
};

/* ---------- drawing helpers ---------- */

const SANS =
  '600 SIZEpx ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SERIF = 'SIZEpx Georgia, "Times New Roman", serif';

function font(spec: string, size: number) {
  return spec.replace("SIZE", String(Math.round(size)));
}

/** Draw an image cropped to fill the box, preserving aspect ratio. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw =
    (image as HTMLImageElement).naturalWidth || (image as HTMLCanvasElement).width;
  const ih =
    (image as HTMLImageElement).naturalHeight || (image as HTMLCanvasElement).height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/** Wrap text to a max width; returns the y after the last line. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 99,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function linearGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  colors.forEach((c, i) => g.addColorStop(i / Math.max(1, colors.length - 1), c));
  return g;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/* ---------- templates ---------- */

export const TEMPLATES: Template[] = [
  {
    id: "bold-statement",
    name: "Bold Statement",
    blurb: "Gradient background, oversized headline",
    ratios: ["square", "portrait", "story"],
    photo: "none",
    fields: [
      { key: "badge", label: "Kicker", placeholder: "NEW THIS WEEK", max: 28 },
      { key: "headline", label: "Headline", placeholder: "Say the one thing that matters", max: 90 },
      { key: "subtext", label: "Supporting line", placeholder: "A short line of context", max: 120 },
    ],
    palettes: [
      ["#F58529", "#DD2A7B", "#8134AF"],
      ["#0F172A", "#1E3A8A"],
      ["#065F46", "#10B981"],
      ["#7C2D12", "#EA580C"],
    ],
    draw({ ctx, w, h, values, palette }) {
      ctx.fillStyle = linearGradient(ctx, w, h, palette);
      ctx.fillRect(0, 0, w, h);

      const pad = w * 0.09;
      let y = h * 0.3;

      if (values.badge) {
        ctx.font = font(SANS, w * 0.028);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.letterSpacing = "3px";
        ctx.fillText(values.badge.toUpperCase(), pad, y);
        ctx.letterSpacing = "0px";
        y += w * 0.07;
      }

      ctx.fillStyle = "#fff";
      ctx.font = font(SANS, w * 0.095);
      y = wrapText(ctx, values.headline || "", pad, y, w - pad * 2, w * 0.108, 5);

      if (values.subtext) {
        ctx.font = font(SANS.replace("600", "400"), w * 0.036);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        wrapText(ctx, values.subtext, pad, y + w * 0.05, w - pad * 2, w * 0.05, 3);
      }
    },
  },
  {
    id: "photo-overlay",
    name: "Photo Overlay",
    blurb: "Full-bleed photo with a legible scrim",
    ratios: ["square", "portrait", "story"],
    photo: "required",
    fields: [
      { key: "badge", label: "Kicker", placeholder: "BEHIND THE SCENES", max: 28 },
      { key: "headline", label: "Headline", placeholder: "Your headline over the photo", max: 80 },
      { key: "subtext", label: "Supporting line", placeholder: "Optional detail", max: 100 },
    ],
    palettes: [["#000000"], ["#0F172A"], ["#3B0764"]],
    draw({ ctx, w, h, values, image, palette }) {
      ctx.fillStyle = palette[0];
      ctx.fillRect(0, 0, w, h);
      if (image) drawCover(ctx, image, 0, 0, w, h);

      // Scrim keeps text readable regardless of the photo underneath.
      const scrim = ctx.createLinearGradient(0, h * 0.35, 0, h);
      scrim.addColorStop(0, "rgba(0,0,0,0)");
      scrim.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, w, h);

      const pad = w * 0.08;
      let y = h - pad;

      if (values.subtext) {
        ctx.font = font(SANS.replace("600", "400"), w * 0.034);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText(values.subtext.slice(0, 100), pad, y);
        y -= w * 0.07;
      }

      ctx.fillStyle = "#fff";
      ctx.font = font(SANS, w * 0.075);
      const words = (values.headline || "").split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > w - pad * 2 && line) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      const lh = w * 0.088;
      y -= (lines.length - 1) * lh;
      lines.forEach((l, i) => ctx.fillText(l, pad, y + i * lh));

      if (values.badge) {
        ctx.font = font(SANS, w * 0.026);
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.letterSpacing = "3px";
        ctx.fillText(values.badge.toUpperCase(), pad, y - lh * 0.75);
        ctx.letterSpacing = "0px";
      }
    },
  },
  {
    id: "quote-card",
    name: "Quote Card",
    blurb: "Serif quote on a soft background",
    ratios: ["square", "portrait"],
    photo: "none",
    fields: [
      { key: "headline", label: "Quote", placeholder: "The line worth repeating", max: 160 },
      { key: "subtext", label: "Attribution", placeholder: "— Name, role", max: 60 },
    ],
    palettes: [
      ["#FDF6EC", "#171717"],
      ["#EEF2FF", "#1E1B4B"],
      ["#F0FDF4", "#14532D"],
      ["#FEF2F2", "#7F1D1D"],
    ],
    draw({ ctx, w, h, values, palette }) {
      const [bg, ink] = palette;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const pad = w * 0.11;
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.18;
      ctx.font = font(SERIF, w * 0.3);
      ctx.fillText("“", pad - w * 0.02, h * 0.3);
      ctx.globalAlpha = 1;

      ctx.font = font(SERIF, w * 0.072);
      const end = wrapText(ctx, values.headline || "", pad, h * 0.38, w - pad * 2, w * 0.095, 6);

      if (values.subtext) {
        ctx.font = font(SANS, w * 0.032);
        ctx.globalAlpha = 0.65;
        ctx.fillText(values.subtext, pad, end + w * 0.06);
        ctx.globalAlpha = 1;
      }
    },
  },
  {
    id: "split-feature",
    name: "Split Feature",
    blurb: "Photo on top, message below",
    ratios: ["square", "portrait", "story"],
    photo: "required",
    fields: [
      { key: "badge", label: "Label", placeholder: "NEW", max: 20 },
      { key: "headline", label: "Headline", placeholder: "What you are showing", max: 70 },
      { key: "subtext", label: "Detail", placeholder: "Price, date or short detail", max: 110 },
    ],
    palettes: [
      ["#111111", "#FFFFFF"],
      ["#1E3A8A", "#FFFFFF"],
      ["#9D174D", "#FFFFFF"],
      ["#065F46", "#FFFFFF"],
    ],
    draw({ ctx, w, h, values, image, palette }) {
      const [ink, paper] = palette;
      const photoH = h * 0.62;
      ctx.fillStyle = "#E5E7EB";
      ctx.fillRect(0, 0, w, photoH);
      if (image) drawCover(ctx, image, 0, 0, w, photoH);

      ctx.fillStyle = paper;
      ctx.fillRect(0, photoH, w, h - photoH);

      const pad = w * 0.08;
      let y = photoH + w * 0.1;

      if (values.badge) {
        ctx.fillStyle = ink;
        roundedRect(ctx, pad, y - w * 0.045, ctx.measureText(values.badge).width + w * 0.07, w * 0.062, w * 0.031);
        ctx.fillStyle = paper;
        ctx.font = font(SANS, w * 0.026);
        ctx.letterSpacing = "2px";
        ctx.fillText(values.badge.toUpperCase(), pad + w * 0.035, y);
        ctx.letterSpacing = "0px";
        y += w * 0.085;
      }

      ctx.fillStyle = ink;
      ctx.font = font(SANS, w * 0.062);
      y = wrapText(ctx, values.headline || "", pad, y, w - pad * 2, w * 0.075, 3);

      if (values.subtext) {
        ctx.font = font(SANS.replace("600", "400"), w * 0.032);
        ctx.globalAlpha = 0.7;
        wrapText(ctx, values.subtext, pad, y + w * 0.04, w - pad * 2, w * 0.045, 2);
        ctx.globalAlpha = 1;
      }
    },
  },
  {
    id: "tip-list",
    name: "Tip List",
    blurb: "Numbered points — good for carousels",
    ratios: ["square", "portrait", "story"],
    photo: "none",
    fields: [
      { key: "badge", label: "Slide label", placeholder: "3 WAYS TO START", max: 30 },
      { key: "headline", label: "Title", placeholder: "The heading for this slide", max: 60 },
      {
        key: "subtext",
        label: "Points (one per line)",
        placeholder: "First point\nSecond point\nThird point",
        max: 320,
      },
    ],
    palettes: [
      ["#FFFFFF", "#111111", "#DD2A7B"],
      ["#0B1120", "#F8FAFC", "#38BDF8"],
      ["#FFFBEB", "#78350F", "#F59E0B"],
      ["#F5F3FF", "#2E1065", "#8B5CF6"],
    ],
    draw({ ctx, w, h, values, palette }) {
      const [bg, ink, accent] = palette;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, w * 0.035, h);

      const pad = w * 0.11;
      let y = h * 0.2;

      if (values.badge) {
        ctx.font = font(SANS, w * 0.026);
        ctx.fillStyle = accent;
        ctx.letterSpacing = "3px";
        ctx.fillText(values.badge.toUpperCase(), pad, y);
        ctx.letterSpacing = "0px";
        y += w * 0.07;
      }

      ctx.fillStyle = ink;
      ctx.font = font(SANS, w * 0.068);
      y = wrapText(ctx, values.headline || "", pad, y, w - pad * 2, w * 0.082, 3);
      y += w * 0.05;

      const points = (values.subtext || "").split("\n").map((p) => p.trim()).filter(Boolean);
      points.slice(0, 6).forEach((point, i) => {
        ctx.fillStyle = accent;
        ctx.font = font(SANS, w * 0.042);
        ctx.fillText(String(i + 1).padStart(2, "0"), pad, y);
        ctx.fillStyle = ink;
        ctx.font = font(SANS.replace("600", "400"), w * 0.038);
        const end = wrapText(ctx, point, pad + w * 0.1, y, w - pad * 2 - w * 0.1, w * 0.05, 2);
        y = end + w * 0.03;
      });
    },
  },
  {
    id: "announcement",
    name: "Announcement",
    blurb: "Date or CTA block, high contrast",
    ratios: ["square", "portrait", "story"],
    photo: "optional",
    fields: [
      { key: "badge", label: "Eyebrow", placeholder: "SAVE THE DATE", max: 26 },
      { key: "headline", label: "Headline", placeholder: "What is happening", max: 70 },
      { key: "subtext", label: "Details", placeholder: "Friday 8pm · Link in bio", max: 90 },
    ],
    palettes: [
      ["#111111", "#FACC15"],
      ["#DD2A7B", "#FFFFFF"],
      ["#1D4ED8", "#FDE047"],
      ["#064E3B", "#A7F3D0"],
    ],
    draw({ ctx, w, h, values, image, palette }) {
      const [bg, accent] = palette;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      if (image) {
        ctx.globalAlpha = 0.35;
        drawCover(ctx, image, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      const pad = w * 0.09;
      ctx.fillStyle = accent;
      ctx.fillRect(pad, h * 0.34, w * 0.16, w * 0.014);

      let y = h * 0.42;
      if (values.badge) {
        ctx.font = font(SANS, w * 0.028);
        ctx.fillStyle = accent;
        ctx.letterSpacing = "4px";
        ctx.fillText(values.badge.toUpperCase(), pad, y);
        ctx.letterSpacing = "0px";
        y += w * 0.075;
      }

      ctx.fillStyle = "#fff";
      ctx.font = font(SANS, w * 0.085);
      y = wrapText(ctx, values.headline || "", pad, y, w - pad * 2, w * 0.098, 4);

      if (values.subtext) {
        ctx.font = font(SANS.replace("600", "400"), w * 0.036);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        wrapText(ctx, values.subtext, pad, y + w * 0.055, w - pad * 2, w * 0.048, 2);
      }
    },
  },
];

/** Render one template into a canvas element. */
export function renderTemplate(
  canvas: HTMLCanvasElement,
  template: Template,
  ratio: Ratio,
  values: TemplateValues,
  image: CanvasImageSource | null,
) {
  const { w, h } = SIZES[ratio];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.textBaseline = "alphabetic";
  const palette = template.palettes[(values.palette ?? 0) % template.palettes.length];
  template.draw({ ctx, w, h, values, image, palette });
}
