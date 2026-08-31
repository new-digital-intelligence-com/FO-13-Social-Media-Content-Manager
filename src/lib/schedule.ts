import "server-only";
import { readStore, writeStore } from "./store";

export type ScheduleStatus = "draft" | "scheduled" | "published" | "failed";

export type StagedFile = { name: string; mimetype: string; s3key: string };

export type ScheduledPost = {
  id: string;
  /** Only "instagram" executes today; the field keeps the queue multi-platform. */
  platform: "instagram";
  kind: "IMAGE" | "REELS" | "STORIES" | "CAROUSEL";
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  imageFile?: StagedFile;
  videoFile?: StagedFile;
  children?: { imageUrl?: string; imageFile?: StagedFile }[];
  /** ISO timestamp. Null means "hold as a draft". */
  publishAt: string | null;
  /**
   * Human in the loop: the runner refuses to publish anything not explicitly
   * approved, no matter how overdue it is.
   */
  approved: boolean;
  status: ScheduleStatus;
  createdAt: string;
  publishedAt?: string;
  error?: string;
  result?: unknown;
};

export async function listPosts(): Promise<ScheduledPost[]> {
  const posts = await readStore<ScheduledPost[]>("schedule", []);
  return posts.sort((a, b) =>
    (a.publishAt ?? a.createdAt).localeCompare(b.publishAt ?? b.createdAt),
  );
}

export async function savePosts(posts: ScheduledPost[]) {
  await writeStore("schedule", posts);
}

export async function addPost(
  post: Omit<ScheduledPost, "id" | "createdAt" | "status">,
): Promise<ScheduledPost> {
  const posts = await listPosts();
  const created: ScheduledPost = {
    ...post,
    id: `sp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: post.publishAt ? "scheduled" : "draft",
  };
  await savePosts([...posts, created]);
  return created;
}

export async function updatePost(
  id: string,
  patch: Partial<ScheduledPost>,
): Promise<ScheduledPost | null> {
  const posts = await listPosts();
  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const next = { ...posts[index], ...patch };
  next.status =
    next.status === "published" || next.status === "failed"
      ? next.status
      : next.publishAt
        ? "scheduled"
        : "draft";
  posts[index] = next;
  await savePosts(posts);
  return next;
}

export async function removePost(id: string) {
  await savePosts((await listPosts()).filter((p) => p.id !== id));
}

/**
 * Scheduled and due.
 *
 * With `autoPublish` off, approval is required and being overdue is not
 * consent. With it on, the schedule itself is the consent -- the decision was
 * made when the post was queued.
 */
export function duePosts(
  posts: ScheduledPost[],
  now = Date.now(),
  autoPublish = false,
) {
  return posts.filter(
    (p) =>
      p.status === "scheduled" &&
      (autoPublish || p.approved) &&
      p.publishAt !== null &&
      Date.parse(p.publishAt) <= now,
  );
}
