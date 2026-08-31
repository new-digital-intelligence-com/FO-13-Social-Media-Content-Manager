import { NextResponse } from "next/server";
import {
  CloudinaryNotConfiguredError,
  cloudinaryConfigured,
  deleteMedia,
  uploadMedia,
  videoFrameUrl,
} from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Per-platform ceilings, checked before spending time on an upload. */
const LIMITS = {
  image: 20 * 1024 * 1024,
  video: 512 * 1024 * 1024,
};

export async function GET() {
  return NextResponse.json({ configured: cloudinaryConfigured });
}

/**
 * One hosting endpoint for every platform. Returns a public URL that Instagram,
 * X and YouTube can all fetch server-side.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: `Unsupported file type "${file.type || "unknown"}".` },
        { status: 400 },
      );
    }

    const limit = isVideo ? LIMITS.video : LIMITS.image;
    if (file.size > limit) {
      return NextResponse.json(
        {
          error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${
            limit / 1024 / 1024
          } MB.`,
        },
        { status: 400 },
      );
    }

    const media = await uploadMedia(file, String(form.get("folder") ?? "content-studio"));

    return NextResponse.json({
      ok: true,
      ...media,
      name: file.name,
      // A video doubles as its own cover source, which is what a Reel needs.
      posterUrl: media.resourceType === "video" ? videoFrameUrl(media.publicId, 0) : null,
    });
  } catch (error) {
    if (error instanceof CloudinaryNotConfiguredError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}

/** Pull a still from an already-uploaded video at a given second. */
export async function PATCH(request: Request) {
  try {
    const { publicId, atSeconds } = await request.json();
    if (!publicId) {
      return NextResponse.json({ error: "publicId is required." }, { status: 400 });
    }
    const url = videoFrameUrl(publicId, Number(atSeconds ?? 0));
    if (!url) {
      return NextResponse.json({ error: "Media hosting is not configured." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const publicId = params.get("publicId");
  if (!publicId) {
    return NextResponse.json({ error: "publicId is required." }, { status: 400 });
  }
  try {
    await deleteMedia(publicId, params.get("resourceType") ?? "image");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
