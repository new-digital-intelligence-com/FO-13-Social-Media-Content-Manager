import { NextResponse } from "next/server";
import { execute } from "@/lib/ig";

export const runtime = "nodejs";

/** ?mediaId=<id> for a post's comments, or ?commentId=<id> for its replies. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mediaId = params.get("mediaId");
  const commentId = params.get("commentId");
  try {
    if (commentId) {
      const replies = await execute("INSTAGRAM_GET_IG_COMMENT_REPLIES", {
        ig_comment_id: commentId,
      });
      return NextResponse.json({
        replies: Array.isArray(replies.data) ? replies.data : [],
        note: replies.note,
      });
    }
    if (!mediaId) {
      return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
    }
    const comments = await execute("INSTAGRAM_GET_IG_MEDIA_COMMENTS", {
      ig_media_id: mediaId,
    });
    return NextResponse.json({
      comments: Array.isArray(comments.data) ? comments.data : [],
      note: comments.note,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/** Comment on a post, or reply to a comment. */
export async function POST(request: Request) {
  try {
    const { mediaId, commentId, message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    const result = commentId
      ? await execute("INSTAGRAM_POST_IG_COMMENT_REPLIES", {
          ig_comment_id: commentId,
          message,
        })
      : await execute("INSTAGRAM_POST_IG_MEDIA_COMMENTS", {
          ig_media_id: mediaId,
          message,
        });
    return NextResponse.json({ ok: true, result: result.data, logId: result.logId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: /permission|scope/i.test(message)
          ? `${message} — comment tools need Meta's instagram_manage_comments permission, which the Composio-managed app may not carry.`
          : message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const commentId = new URL(request.url).searchParams.get("commentId");
  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }
  try {
    const result = await execute("INSTAGRAM_DELETE_COMMENT", { ig_comment_id: commentId });
    return NextResponse.json({ ok: true, result: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
