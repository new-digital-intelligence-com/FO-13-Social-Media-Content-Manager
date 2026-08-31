import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Single source of truth for Instagram behaviour.
 *
 * The plugin's skills are the contract. Rather than restating those rules in a
 * second prompt that can drift, the app reads the same file the `instagram`
 * skill loads, so a rule changed once applies to both Claude Code and this app.
 */
const RULES_PATH = path.join(
  process.cwd(),
  "plugins/instagram-manager/skills/instagram/references/rules.md",
);

const X_RULES_PATH = path.join(
  process.cwd(),
  "plugins/x-manager/skills/x/references/rules.md",
);

const YT_RULES_PATH = path.join(
  process.cwd(),
  "plugins/youtube-manager/skills/youtube/references/rules.md",
);

let cached: string | null = null;
let cachedX: string | null = null;
let cachedYt: string | null = null;

/** Strip frontmatter and the heading; keep the rules themselves. */
function normalize(markdown: string) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

export async function instagramRules(): Promise<string> {
  if (cached) return cached;
  try {
    cached = normalize(await readFile(RULES_PATH, "utf8"));
  } catch {
    // The app must still run if the plugin directory is absent (e.g. a deploy
    // that ships only src/). Fall back to the invariants that keep it safe.
    cached = [
      "Instagram supports Business/Creator accounts only. `ig_user_id` accepts \"me\".",
      "Profile fields (bio, name, website, picture) are read-only — Meta exposes no endpoint.",
      "Never invent a tool slug; discover with COMPOSIO_SEARCH_TOOLS.",
      "Confirm before publishing, sending, replying or deleting. Read-only calls need no confirmation.",
      "Report only what the API returned; never estimate a metric.",
      "Media URLs must be public HTTP/HTTPS — Meta fetches them server-side.",
    ].join("\n");
  }
  return cached;
}

const X_FALLBACK = [
  "X counts URLs and unicode its own way; keep posts under 280 characters.",
  "Never invent a tool slug; discover with COMPOSIO_SEARCH_TOOLS.",
  "Confirm before posting, replying, deleting, following, muting or sending a DM.",
  "Report only what the API returned; never estimate a metric.",
  "X enforces plan-based access tiers and per-app rate limits; a 403 or UsageCapExceeded is a plan or quota problem, not a bug.",
].join("\n");

export async function xRules(): Promise<string> {
  if (cachedX) return cachedX;
  try {
    cachedX = normalize(await readFile(X_RULES_PATH, "utf8"));
  } catch {
    cachedX = X_FALLBACK;
  }
  return cachedX;
}

const YT_FALLBACK = [
  "YouTube API quota is the main constraint; a shared managed app exhausts it faster than expected.",
  "Never invent a tool slug; discover with COMPOSIO_SEARCH_TOOLS.",
  "Confirm before uploading, publishing, editing, deleting or moderating.",
  "Uploads default to private; never publish publicly without explicit agreement.",
  "Load captions before answering questions about a video's content; never guess what a video says.",
  "Report only what the API returned; never estimate views or watch time.",
].join("\n");

export async function ytRules(): Promise<string> {
  if (cachedYt) return cachedYt;
  try {
    cachedYt = normalize(await readFile(YT_RULES_PATH, "utf8"));
  } catch {
    cachedYt = YT_FALLBACK;
  }
  return cachedYt;
}
