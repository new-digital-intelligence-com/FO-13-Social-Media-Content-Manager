import { NextResponse } from "next/server";
import { execute } from "@/lib/ig";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [stories, live] = await Promise.all([
      execute("INSTAGRAM_GET_IG_USER_STORIES"),
      execute("INSTAGRAM_GET_IG_USER_LIVE_MEDIA").catch(() => null),
    ]);
    return NextResponse.json({
      stories: Array.isArray(stories.data) ? stories.data : [],
      live: Array.isArray(live?.data) ? live.data : [],
      note: stories.note,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
