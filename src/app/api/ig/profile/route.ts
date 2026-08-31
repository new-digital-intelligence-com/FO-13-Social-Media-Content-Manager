import { NextResponse } from "next/server";
import { execute, type Profile, type PublishingLimit } from "@/lib/ig";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [profile, limit] = await Promise.all([
      execute<Profile>("INSTAGRAM_GET_USER_INFO"),
      execute<PublishingLimit[]>("INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT"),
    ]);
    const quota = Array.isArray(limit.data) ? limit.data[0] : undefined;
    return NextResponse.json({
      profile: profile.data,
      quota: {
        used: quota?.quota_usage ?? 0,
        total: quota?.config?.quota_total ?? null,
        windowHours: quota?.config?.quota_duration
          ? quota.config.quota_duration / 3600
          : 24,
      },
      note: profile.note,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
