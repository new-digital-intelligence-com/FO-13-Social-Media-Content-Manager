import { ytExecute, ytRoute } from "@/lib/yt";

export const runtime = "nodejs";

export async function GET() {
  return ytRoute(async () => {
    const r = await ytExecute("YOUTUBE_LIST_USER_SUBSCRIPTIONS", {
      part: "snippet,contentDetails",
      mine: true,
      maxResults: 50,
    });
    return { subscriptions: r.data, note: r.note };
  });
}

export async function POST(request: Request) {
  const { action, channelId, subscriptionId } = await request.json();
  return ytRoute(async () => {
    // Unsubscribing takes the *subscription* id, not the channel id.
    if (action === "unsubscribe") {
      if (!subscriptionId) {
        throw new Error(
          "subscriptionId is required to unsubscribe -- read it from your subscriptions list, it is not the channel id.",
        );
      }
      const r = await ytExecute("YOUTUBE_UNSUBSCRIBE_CHANNEL", { subscriptionId });
      return { ok: true, result: r.data };
    }
    if (!channelId) throw new Error("channelId is required.");
    const r = await ytExecute("YOUTUBE_SUBSCRIBE_CHANNEL", { channelId });
    return { ok: true, result: r.data };
  });
}
