import { NextResponse } from "next/server";
import {
  addPost,
  queue,
  removePost,
  updatePost,
  type Platform,
} from "@/lib/schedule";

export const runtime = "nodejs";

function platformOf(request: Request): Platform {
  const p = new URL(request.url).searchParams.get("platform");
  return p === "youtube" ? "youtube" : "instagram";
}

export async function GET(request: Request) {
  const view = await queue(platformOf(request));
  const posts = view.posts;
  return NextResponse.json({
    // `available: false` means the queue could not be read — not that it is
    // empty. The UI renders those two states differently on purpose.
    available: view.available,
    detail: view.detail,
    needsSetup: view.needsSetup,
    posts,
    counts: {
      draft: posts.filter((p) => p.status === "draft").length,
      scheduled: posts.filter((p) => p.status === "scheduled").length,
      published: posts.filter((p) => p.status === "published").length,
      failed: posts.filter((p) => p.status === "failed").length,
    },
  });
}

/**
 * Instagram post kind -> Zernio platform fields.
 *
 * Zernio infers most kinds from the media: one image is a feed post, one video
 * is a Reel, several images are a carousel. A **Story is the exception** — it
 * looks identical to a feed image and only `contentType: "story"` distinguishes
 * it. Dropping this is why a scheduled Story published as a normal post.
 */
function instagramOptions(kind: string | undefined, extra: Record<string, unknown> = {}) {
  return kind === "STORIES" ? { contentType: "story", ...extra } : extra;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const platform: Platform = body.platform === "youtube" ? "youtube" : "instagram";

  // Zernio fetches media from a public URL. A staged Composio file descriptor
  // is not one, so fail loudly instead of scheduling a post with no media.
  if (!body.mediaUrl && !body.imageUrl && !body.videoUrl && (body.imageFile || body.videoFile)) {
    return NextResponse.json(
      {
        error:
          "Scheduling needs a public media URL. Re-add the media so it is hosted first, or paste a URL.",
        needsSetup: true,
      },
      { status: 400 },
    );
  }

  // Carousel slides arrive as `children`; every slide has to reach Zernio or
  // the post silently publishes as a single image.
  const extraMedia: string[] = Array.isArray(body.children)
    ? body.children.map((c: { imageUrl?: string }) => c?.imageUrl).filter(Boolean)
    : [];

  const result = await addPost({
    platform,
    caption: body.caption,
    mediaUrl: body.mediaUrl ?? body.imageUrl ?? body.videoUrl,
    mediaUrls: extraMedia,
    mediaType: body.videoUrl || body.kind === "REELS" ? "video" : body.mediaType,
    publishAt: body.publishAt ?? null,
    useQueue: Boolean(body.useQueue),
    timezone: body.timezone,
    options:
      platform === "instagram"
        ? instagramOptions(body.kind, body.options ?? {})
        : body.options,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.detail, needsSetup: result.needsSetup, existingPostId: result.existingPostId },
      // A configuration gap is the caller's to fix; an outage is not.
      { status: result.needsSetup ? 400 : 503 },
    );
  }
  return NextResponse.json({ post: result.post });
}

export async function PATCH(request: Request) {
  const { id, platform, ...patch } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const result = await updatePost(id, patch, platform === "youtube" ? "youtube" : "instagram");
  if (!result.ok) {
    return NextResponse.json(
      { error: result.detail },
      { status: result.needsSetup ? 400 : 503 },
    );
  }
  return NextResponse.json({ post: result.post });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const result = await removePost(id);
  if (!result.ok) return NextResponse.json({ error: result.detail }, { status: 503 });
  return NextResponse.json({ ok: true });
}
