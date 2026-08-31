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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const result = await addPost({
    platform: body.platform === "youtube" ? "youtube" : "instagram",
    caption: body.caption,
    mediaUrl: body.mediaUrl ?? body.imageUrl ?? body.videoUrl,
    mediaType: body.videoUrl ? "video" : body.mediaType,
    publishAt: body.publishAt ?? null,
    useQueue: Boolean(body.useQueue),
    timezone: body.timezone,
    options: body.options,
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
