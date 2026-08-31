import { xRoute } from "@/lib/x-route";
import { xExecute } from "@/lib/x";

export const runtime = "nodejs";

/** The authenticated account, its graph counts and monthly post usage. */
export async function GET() {
  return xRoute(async () => {
    const me = await xExecute<{ id?: string; username?: string; name?: string }>(
      "TWITTER_USER_LOOKUP_ME",
      {
        "user__fields": [
          "id",
          "name",
          "username",
          "description",
          "profile_image_url",
          "public_metrics",
          "verified",
          "created_at",
        ],
      },
    );
    const usage = await xExecute("TWITTER_GET_POST_USAGE").catch(() => null);
    return { me: me.data, usage: usage?.data ?? null, note: me.note };
  });
}
