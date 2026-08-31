import { NextResponse } from "next/server";
import { runDuePosts } from "@/lib/publish-queue";
import { schedulerState } from "@/lib/scheduler";
import { duePosts, listPosts } from "@/lib/schedule";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Publish everything due now. Also reachable from cron in production. */
export async function POST() {
  try {
    return NextResponse.json(await runDuePosts());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/** What would run, plus the background scheduler's health. */
export async function GET() {
  const [posts, settings, scheduler] = await Promise.all([
    listPosts(),
    getSettings(),
    schedulerState(),
  ]);
  const due = duePosts(posts, Date.now(), settings.autoPublish);

  return NextResponse.json({
    autoPublish: settings.autoPublish,
    scheduler,
    due: due.map((p) => ({ id: p.id, publishAt: p.publishAt, kind: p.kind })),
    // Only meaningful while approval is required.
    blockedByApproval: settings.autoPublish
      ? []
      : posts
          .filter(
            (p) =>
              p.status === "scheduled" &&
              !p.approved &&
              p.publishAt !== null &&
              Date.parse(p.publishAt) <= Date.now(),
          )
          .map((p) => ({ id: p.id, publishAt: p.publishAt })),
  });
}
