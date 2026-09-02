import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { NextResponse } from "next/server";
import { addPost, queue, removePost, updatePost, type Platform } from "@/lib/schedule";
import { zernioHealth } from "@/lib/zernio";
import {
  bestTime,
  contentDecay,
  createAutomation,
  createQueueSlots,
  crossPost,
  deleteAutomation,
  instagramDemographics,
  instagramFollowerHistory,
  listAutomations,
  listQueueSlots,
  postingFrequency,
  setAutomationActive,
  youtubeChannelInsights,
  youtubeDailyViews,
  youtubeDemographics,
  youtubeRetention,
} from "@/lib/zernio-features";

/**
 * This app, exposed as a remote MCP server.
 *
 * Why it exists: an Artifact cannot fetch this app's REST API — the artifact CSP
 * blocks cross-origin fetch/XHR outright. The only way a published page can
 * reach a backend is the `mcp` capability, which calls the viewer's *connectors*.
 * So to drive this deployment from inside a Claude artifact, the app has to BE a
 * connector. Same server also serves Claude Code and the Claude app.
 *
 * Auth: the token is a path segment rather than a header, because a claude.ai
 * custom connector is added by URL and cannot be given a static Authorization
 * header. An unguessable URL is the practical shared secret; an `Authorization:
 * Bearer <token>` header is accepted too, for CLI clients that can send one.
 * Set MCP_TOKEN to a long random string — without it the endpoint is disabled
 * rather than open, because this server can publish to real accounts.
 */

const platform = z.enum(["instagram", "youtube"]);

/** Tool results are text blocks; JSON keeps the shape legible to the model. */
const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

/**
 * A failure is reported, never thrown: the model has to be able to tell the user
 * *why* something is unavailable — and "not configured" needs a different answer
 * from "the provider is down".
 */
const fail = (detail: string, needsSetup = false) =>
  ok({
    error: detail,
    kind: needsSetup ? "setup_required" : "provider_unavailable",
    guidance: needsSetup
      ? "Tell the user what to configure. Do not retry."
      : "Say the capability is unavailable. Do not invent a result, and do not claim anything was scheduled.",
  });

type Outcome = { ok: boolean; detail?: string; needsSetup?: boolean; data?: unknown };
const settle = (r: Outcome) => (r.ok ? ok(r.data) : fail(r.detail ?? "Failed.", r.needsSetup));

const handler = createMcpHandler((server) => {
  server.registerTool(
    "status",
    {
      title: "Connection status",
      description:
        "Which platforms and providers are connected, and whether reads and writes are pointing at the same account. Call this first when something looks empty.",
      inputSchema: z.object({}),
    },
    async () => ok(await zernioHealth(true)),
  );

  server.registerTool(
    "list_queue",
    {
      title: "List the publishing queue",
      description:
        "Scheduled posts, drafts and recently published posts. If it returns available:false the queue could NOT be read — that is an outage, not an empty queue, and must be reported as such.",
      inputSchema: z.object({ platform }),
    },
    async ({ platform: p }) => ok(await queue(p as Platform)),
  );

  server.registerTool(
    "schedule_post",
    {
      title: "Schedule a post",
      description:
        "Hold a post and publish it at its time, with up to 3 retries. Give publishAt for a specific time, or useQueue for the next free recurring slot; omit both to save a draft that will never publish. This publishes to a real account — confirm the caption, media and local time with the user first.",
      inputSchema: z.object({
        platform,
        caption: z.string().optional(),
        mediaUrl: z.string().optional().describe("Public URL. Instagram requires media."),
        mediaType: z.enum(["image", "video"]).optional(),
        publishAt: z.string().optional().describe("ISO 8601."),
        useQueue: z.boolean().optional(),
        timezone: z.string().optional().describe("IANA zone for publishAt."),
        options: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            "Platform fields. Instagram: contentType 'story', collaborators, firstComment. YouTube: title, visibility (private unless asked), categoryId.",
          ),
      }),
    },
    async (a) => {
      const r = await addPost({ ...a, platform: a.platform as Platform });
      return r.ok ? ok(r.post) : fail(r.detail, r.needsSetup);
    },
  );

  server.registerTool(
    "update_scheduled_post",
    {
      title: "Reschedule or unschedule",
      description:
        "Change a queued post's time, or pass publishAt:null to return it to a draft so it will not publish.",
      inputSchema: z.object({
        id: z.string(),
        platform: platform.optional(),
        publishAt: z.string().nullable().optional(),
        caption: z.string().optional(),
        timezone: z.string().optional(),
      }),
    },
    async ({ id, platform: p, ...patch }) => {
      const r = await updatePost(id, patch, (p ?? "instagram") as Platform);
      return r.ok ? ok(r.post) : fail(r.detail, r.needsSetup);
    },
  );

  server.registerTool(
    "delete_scheduled_post",
    {
      title: "Delete a queued post",
      description: "Remove a post from the queue so it will not publish. Confirm first.",
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) => {
      const r = await removePost(id);
      return r.ok ? ok({ deleted: true }) : fail(r.detail ?? "Failed.");
    },
  );

  server.registerTool(
    "analytics",
    {
      title: "Measured analytics",
      description:
        "Metrics that need history across posts and have no single-call equivalent. best-time returns day_of_week (0=Monday) and hour in UTC — convert to local before recommending a time, and ignore slots with a low post_count. Never estimate a metric this cannot return.",
      inputSchema: z.object({
        metric: z.enum([
          "best-time",
          "decay",
          "frequency",
          "ig-demographics",
          "ig-followers",
          "yt-channel",
          "yt-daily-views",
          "yt-demographics",
          "yt-retention",
        ]),
        platform: platform.optional(),
        videoId: z.string().optional().describe("Required for yt-retention."),
      }),
    },
    async ({ metric, platform: p = "instagram", videoId }) => {
      const r = await (metric === "best-time"
        ? bestTime(p)
        : metric === "decay"
          ? contentDecay(p)
          : metric === "frequency"
            ? postingFrequency(p)
            : metric === "ig-demographics"
              ? instagramDemographics()
              : metric === "ig-followers"
                ? instagramFollowerHistory()
                : metric === "yt-channel"
                  ? youtubeChannelInsights()
                  : metric === "yt-daily-views"
                    ? youtubeDailyViews()
                    : metric === "yt-demographics"
                      ? youtubeDemographics()
                      : youtubeRetention(videoId ?? ""));
      return settle(r as Outcome);
    },
  );

  server.registerTool(
    "queue_slots",
    {
      title: "Recurring posting slots",
      description:
        "Read or create the recurring slots that useQueue assigns to. An empty list means queueing is impossible until slots exist — a setup gap, not an outage. Ask for the timezone and times rather than inventing a cadence.",
      inputSchema: z.object({
        action: z.enum(["list", "create"]),
        name: z.string().optional(),
        timezone: z.string().optional().describe("IANA zone."),
        slots: z
          .array(z.object({ dayOfWeek: z.number(), hour: z.number(), minute: z.number() }))
          .optional(),
      }),
    },
    async ({ action, name, timezone, slots }) =>
      settle(
        (action === "create"
          ? await createQueueSlots({ name: name ?? "Default", timezone: timezone ?? "UTC", slots: slots ?? [] })
          : await listQueueSlots()) as Outcome,
      ),
  );

  server.registerTool(
    "list_automations",
    {
      title: "List comment-to-DM automations",
      description: "Existing keyword automations and their delivered/read/click stats.",
      inputSchema: z.object({}),
    },
    async () => settle((await listAutomations()) as Outcome),
  );

  server.registerTool(
    "create_automation",
    {
      title: "Create a comment-to-DM automation",
      description:
        "Someone comments a keyword, they get a DM. Omit platformPostId to run account-wide across every post. This messages real people unattended until it is disabled — show the exact keywords, the exact DM text and the targeting, and get explicit agreement before calling.",
      inputSchema: z.object({
        name: z.string().optional(),
        keywords: z.array(z.string()),
        dmMessage: z.string(),
        platformPostId: z.string().optional().describe("Scope to one post. Omit for account-wide."),
        trigger: z.enum(["comment", "story_reply"]).optional(),
        alsoMatchInDms: z.boolean().optional(),
      }),
    },
    async (a) => settle((await createAutomation(a)) as Outcome),
  );

  server.registerTool(
    "set_automation_active",
    {
      title: "Turn an automation on or off",
      description: "Arming one starts DMing real people. Confirm before enabling.",
      inputSchema: z.object({ id: z.string(), isActive: z.boolean() }),
    },
    async ({ id, isActive }) => settle((await setAutomationActive(id, isActive)) as Outcome),
  );

  server.registerTool(
    "delete_automation",
    {
      title: "Delete an automation",
      description: "Permanently removes it. Confirm first.",
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) => settle((await deleteAutomation(id)) as Outcome),
  );

  server.registerTool(
    "crosspost",
    {
      title: "Post to several platforms at once",
      description:
        "One payload, several targets, per-platform wording via customContent. Instagram needs media and allows 2200 chars; YouTube needs a video and takes its title in options.title; X is a hard 280. The result reports per-platform outcomes and a 'skipped' list — report those individually, never as a single 'posted', and retry only failed targets.",
      inputSchema: z.object({
        content: z.string(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(["image", "video"]).optional(),
        targets: z.array(
          z.object({
            platform: z.string(),
            customContent: z.string().optional(),
            options: z.record(z.string(), z.unknown()).optional(),
          }),
        ),
        publishAt: z.string().optional(),
        useQueue: z.boolean().optional(),
        timezone: z.string().optional(),
      }),
    },
    async (a) => settle((await crossPost(a)) as Outcome),
  );
});

/**
 * Gate every method on the token. Returning 404 rather than 401 keeps the
 * endpoint's existence unadvertised to anyone guessing URLs.
 */
function guard(request: Request, token: string) {
  const expected = process.env.MCP_TOKEN;
  if (!expected || expected.length < 24) return "disabled";
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return token === expected || header === expected ? null : "denied";
}

async function route(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await ctx.params;
  const problem = guard(request, token);
  if (problem === "disabled") {
    return NextResponse.json(
      { error: "MCP endpoint is disabled. Set MCP_TOKEN (24+ characters) to enable it." },
      { status: 503 },
    );
  }
  if (problem) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return handler(request);
}

export { route as GET, route as POST, route as DELETE };
