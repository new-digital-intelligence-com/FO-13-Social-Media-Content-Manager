import { NextResponse } from "next/server";
import { addPost, listPosts, removePost, updatePost } from "@/lib/schedule";

export const runtime = "nodejs";

export async function GET() {
  const posts = await listPosts();
  return NextResponse.json({
    posts,
    counts: {
      draft: posts.filter((p) => p.status === "draft").length,
      scheduled: posts.filter((p) => p.status === "scheduled").length,
      awaitingApproval: posts.filter((p) => p.status === "scheduled" && !p.approved)
        .length,
      published: posts.filter((p) => p.status === "published").length,
      failed: posts.filter((p) => p.status === "failed").length,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.kind) {
      return NextResponse.json({ error: "kind is required." }, { status: 400 });
    }
    // New items are never pre-approved: approval is an explicit human action.
    const post = await addPost({ ...body, platform: "instagram", approved: false });
    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, ...patch } = await request.json();
    const post = await updatePost(id, patch);
    if (!post) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  await removePost(id);
  return NextResponse.json({ ok: true });
}
