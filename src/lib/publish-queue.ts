import "server-only";
import { execute, ME } from "./ig";
import { getSettings } from "./settings";
import { duePosts, listPosts, updatePost, type ScheduledPost } from "./schedule";

/**
 * Publishing a queued post.
 *
 * Lives here rather than in the route so the background scheduler and the
 * manual "run now" button share one implementation -- two copies would drift,
 * and this one publishes to a real audience.
 */
async function publish(post: ScheduledPost) {
  let creationId: string | undefined;

  if (post.kind === "CAROUSEL") {
    const childIds: string[] = [];
    for (const slide of post.children ?? []) {
      const child = await execute<{ id?: string }>("INSTAGRAM_POST_IG_USER_MEDIA", {
        ig_user_id: ME,
        is_carousel_item: true,
        ...(slide.imageUrl ? { image_url: slide.imageUrl } : {}),
        ...(slide.imageFile ? { image_file: slide.imageFile } : {}),
      });
      if (!child.data?.id) throw new Error("A carousel slide container failed.");
      childIds.push(child.data.id);
    }
    const parent = await execute<{ id?: string }>("INSTAGRAM_CREATE_CAROUSEL_CONTAINER", {
      ig_user_id: ME,
      children: childIds,
      ...(post.caption ? { caption: post.caption } : {}),
    });
    creationId = parent.data?.id;
  } else {
    const container = await execute<{ id?: string }>("INSTAGRAM_POST_IG_USER_MEDIA", {
      ig_user_id: ME,
      ...(post.caption ? { caption: post.caption } : {}),
      ...(post.imageUrl ? { image_url: post.imageUrl } : {}),
      ...(post.videoUrl ? { video_url: post.videoUrl } : {}),
      ...(post.imageFile ? { image_file: post.imageFile } : {}),
      ...(post.videoFile ? { video_file: post.videoFile } : {}),
      ...(post.kind === "REELS" ? { media_type: "REELS", share_to_feed: true } : {}),
      ...(post.kind === "STORIES" ? { media_type: "STORIES" } : {}),
    });
    creationId = container.data?.id;
  }

  if (!creationId) throw new Error("Instagram did not return a container id.");

  const published = await execute("INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH", {
    ig_user_id: ME,
    creation_id: creationId,
  });
  return published.data;
}

export type RunResult = {
  due: number;
  ran: { id: string; status: string; error?: string }[];
  autoPublish: boolean;
};

/**
 * Publish everything due.
 *
 * With `autoPublish` on, a scheduled post fires at its time with no further
 * input. With it off, an unapproved post stays queued no matter how overdue --
 * being late is not consent.
 */
export async function runDuePosts(): Promise<RunResult> {
  const settings = await getSettings();
  const posts = await listPosts();
  const due = duePosts(posts, Date.now(), settings.autoPublish);

  const ran: RunResult["ran"] = [];
  for (const post of due) {
    try {
      const result = await publish(post);
      await updatePost(post.id, {
        status: "published",
        publishedAt: new Date().toISOString(),
        result,
      });
      ran.push({ id: post.id, status: "published" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      // Mark failed rather than retrying forever; a repeatedly failing post
      // would otherwise be attempted on every tick.
      await updatePost(post.id, { status: "failed", error: message });
      ran.push({ id: post.id, status: "failed", error: message });
    }
  }

  return { due: due.length, ran, autoPublish: settings.autoPublish };
}
