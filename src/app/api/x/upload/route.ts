import { NextResponse } from "next/server";
import { composio } from "@/lib/composio";
import { cloudinaryConfigured, uploadMedia } from "@/lib/cloudinary";
import { xExecute, TOOLKIT } from "@/lib/x";
import { xRoute } from "@/lib/x-route";

export const runtime = "nodejs";
export const maxDuration = 180;

/** Stage a file with Composio, then hand it to X's media upload. */
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > 512 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 512 MB." }, { status: 400 });
  }

  return xRoute(async () => {
    // Host it too when available, so the same asset can be reused elsewhere
    // (and so the user has a durable URL rather than temporary staging).
    const hosted = cloudinaryConfigured ? await uploadMedia(file, "x") : null;

    const staged = await composio.files.upload({
      file,
      toolSlug: "TWITTER_UPLOAD_MEDIA",
      toolkitSlug: TOOLKIT,
    });
    // X splits large uploads into chunked sessions; the toolkit exposes both.
    const slug = file.size > 5 * 1024 * 1024 ? "TWITTER_UPLOAD_LARGE_MEDIA" : "TWITTER_UPLOAD_MEDIA";
    const r = await xExecute<{ media_id?: string; id?: string }>(slug, { media: staged });
    return {
      ok: true,
      mediaId: r.data?.media_id ?? r.data?.id ?? null,
      raw: r.data,
      name: file.name,
      hostedUrl: hosted?.url ?? null,
    };
  });
}
