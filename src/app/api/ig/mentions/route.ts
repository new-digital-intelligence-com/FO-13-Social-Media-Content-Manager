import { NextResponse } from "next/server";
import { execute, ME } from "@/lib/ig";

export const runtime = "nodejs";

/**
 * Reply where the account was @mentioned in someone else's media or comment.
 * Distinct from replying on your own post: that is
 * INSTAGRAM_POST_IG_COMMENT_REPLIES.
 */
export async function POST(request: Request) {
  try {
    const { mediaId, commentId, message } = await request.json();
    if (!mediaId || !message?.trim()) {
      return NextResponse.json(
        { error: "mediaId and message are required." },
        { status: 400 },
      );
    }
    const result = await execute("INSTAGRAM_POST_IG_USER_MENTIONS", {
      ig_user_id: ME,
      media_id: mediaId,
      message,
      ...(commentId ? { comment_id: commentId } : {}),
    });
    return NextResponse.json({ ok: true, result: result.data, logId: result.logId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: /permission|scope/i.test(message)
          ? `${message} — mention replies need Meta's instagram_manage_comments permission.`
          : message,
      },
      { status: 500 },
    );
  }
}
