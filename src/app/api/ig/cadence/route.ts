import { NextResponse } from "next/server";
import { execute, MEDIA_FIELDS, ME, type Media } from "@/lib/ig";
import { getSettings } from "@/lib/settings";
import { listPosts } from "@/lib/schedule";

export const runtime = "nodejs";

const DAY = 86_400_000;

/** Posting rhythm measured from real post timestamps, against the target. */
export async function GET() {
  try {
    const [settings, media, queued] = await Promise.all([
      getSettings(),
      execute<Media[]>("INSTAGRAM_GET_IG_USER_MEDIA", {
        ig_user_id: ME,
        fields: MEDIA_FIELDS,
        limit: 50,
      }),
      listPosts(),
    ]);

    const posts = (Array.isArray(media.data) ? media.data : [])
      .map((m) => Date.parse(m.timestamp ?? ""))
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => b - a);

    const now = Date.now();
    const within = (days: number) => posts.filter((t) => now - t <= days * DAY).length;
    const lastPostAt = posts[0] ?? null;
    const daysSinceLast = lastPostAt ? Math.floor((now - lastPostAt) / DAY) : null;

    // Average gap across the most recent posts, in days.
    const gaps = posts.slice(0, 12).flatMap((t, i, arr) =>
      i === 0 ? [] : [(arr[i - 1] - t) / DAY],
    );
    const averageGapDays = gaps.length
      ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10
      : null;

    const last7 = within(7);
    const upcoming = queued.filter(
      (p) => p.status === "scheduled" && p.publishAt && Date.parse(p.publishAt) > now,
    );
    const scheduledNext7 = upcoming.filter(
      (p) => Date.parse(p.publishAt!) - now <= 7 * DAY,
    ).length;

    const target = settings.cadencePerWeek;
    const projected = last7 + scheduledNext7;

    return NextResponse.json({
      target,
      last7,
      last30: within(30),
      totalKnown: posts.length,
      lastPostAt: lastPostAt ? new Date(lastPostAt).toISOString() : null,
      daysSinceLast,
      averageGapDays,
      scheduledNext7,
      onTrack: projected >= target,
      shortfall: Math.max(0, target - projected),
      note: media.note,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
