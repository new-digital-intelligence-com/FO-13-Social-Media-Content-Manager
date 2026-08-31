import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { addPost, queue, removePost, updatePost, type Platform } from "./schedule";
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
} from "./zernio-features";
import { zernioHealth } from "./zernio";

/**
 * Zernio tools for the app's own agent.
 *
 * The plugin skills reach these capabilities through the Zernio MCP connector.
 * The app's agent has no MCP, so it gets the same capabilities as native tool
 * definitions backed by the same functions the REST routes use. That parity is
 * the point: a request answered by `/instagram` in Claude Code must be
 * answerable in the app's Ask AI tab.
 */

const PREFIX = "zernio_";

export const ZERNIO_TOOLS: Anthropic.Tool[] = [
  {
    name: `${PREFIX}list_queue`,
    description:
      "List scheduled posts, drafts and recently published posts held by Zernio for a platform. Use before promising anything about what is queued. If it reports available:false, the queue could NOT be read — that is not an empty queue, and you must say so.",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["instagram", "youtube"] },
      },
      required: ["platform"],
    },
  },
  {
    name: `${PREFIX}schedule_post`,
    description:
      "Schedule a post on Zernio, which holds it and publishes it at its time with up to 3 retries. Set publishAt for a specific time, or useQueue:true to take the profile's next free recurring slot. Omit both to save a draft that will never publish. Confirm the exact caption, media and local time with the user before calling.",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["instagram", "youtube"] },
        caption: { type: "string", description: "Caption or description text." },
        mediaUrl: { type: "string", description: "Public URL. Instagram requires media." },
        mediaType: { type: "string", enum: ["image", "video"] },
        publishAt: { type: "string", description: "ISO 8601 time." },
        useQueue: { type: "boolean", description: "Take the next free queue slot instead." },
        timezone: { type: "string", description: "IANA timezone for publishAt." },
        options: {
          type: "object",
          description:
            "Platform fields. YouTube: title, visibility (private unless asked), categoryId, firstComment. Instagram: contentType 'story', collaborators, firstComment, isAiGenerated.",
        },
      },
      required: ["platform"],
    },
  },
  {
    name: `${PREFIX}update_scheduled_post`,
    description:
      "Reschedule a queued post, or clear its time (publishAt:null) to return it to a draft so it will not publish.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        platform: { type: "string", enum: ["instagram", "youtube"] },
        publishAt: { type: ["string", "null"] },
        caption: { type: "string" },
        timezone: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: `${PREFIX}delete_scheduled_post`,
    description: "Delete a post from the Zernio queue so it will not publish. Confirm first.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: `${PREFIX}analytics`,
    description:
      "Measured analytics that need history across posts and have no equivalent in the platform toolkits. best-time returns slots with day_of_week (0=Monday) and hour in UTC — convert to local before recommending a time, and ignore slots with a low post_count. Never estimate a metric this returns; if it is unavailable, say so.",
    input_schema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: [
            "best-time",
            "decay",
            "frequency",
            "ig-demographics",
            "ig-followers",
            "yt-channel",
            "yt-daily-views",
            "yt-demographics",
            "yt-retention",
          ],
        },
        platform: { type: "string", enum: ["instagram", "youtube"] },
        videoId: { type: "string", description: "Required for yt-retention." },
      },
      required: ["metric"],
    },
  },
  {
    name: `${PREFIX}list_automations`,
    description:
      "List Instagram comment-to-DM automations and their delivered/read/click stats.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: `${PREFIX}create_automation`,
    description:
      "Create an Instagram comment-to-DM automation: someone comments a keyword, they get a DM. Omit platformPostId to run account-wide across every post. This messages real people unattended until disabled — show the exact keywords, the exact DM text and the targeting, and get explicit agreement before calling.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
        dmMessage: { type: "string" },
        platformPostId: { type: "string", description: "Scope to one post. Omit for account-wide." },
        trigger: { type: "string", enum: ["comment", "story_reply"] },
        alsoMatchInDms: { type: "boolean" },
      },
      required: ["keywords", "dmMessage"],
    },
  },
  {
    name: `${PREFIX}set_automation_active`,
    description: "Enable or disable an existing automation. Confirm before enabling.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, isActive: { type: "boolean" } },
      required: ["id", "isActive"],
    },
  },
  {
    name: `${PREFIX}delete_automation`,
    description: "Permanently delete a comment-to-DM automation. Confirm first.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: `${PREFIX}crosspost`,
    description:
      "Publish or schedule one payload to several platforms at once, with per-platform wording via customContent. Instagram allows 2200 chars and requires media; YouTube needs a video and takes its title in options.title. The result reports per-platform outcomes and a 'skipped' list — report those individually, never as a single 'posted', and retry only failed targets.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string" },
        mediaUrl: { type: "string" },
        mediaType: { type: "string", enum: ["image", "video"] },
        targets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              platform: { type: "string" },
              customContent: { type: "string" },
              options: { type: "object" },
            },
            required: ["platform"],
          },
        },
        publishAt: { type: "string" },
        useQueue: { type: "boolean" },
        timezone: { type: "string" },
      },
      required: ["content", "targets"],
    },
  },
  {
    name: `${PREFIX}queue_slots`,
    description:
      "Read or create the recurring posting slots that useQueue assigns to. An empty list means queueing is impossible until slots exist — that is a setup gap, not an outage. Ask for the timezone and times rather than inventing a cadence.",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "create"] },
        name: { type: "string" },
        timezone: { type: "string", description: "IANA timezone." },
        slots: {
          type: "array",
          description: "Recurring times, e.g. [{dayOfWeek:1,hour:9,minute:0}].",
          items: {
            type: "object",
            properties: {
              dayOfWeek: { type: "number" },
              hour: { type: "number" },
              minute: { type: "number" },
            },
          },
        },
      },
      required: ["action"],
    },
  },
  {
    name: `${PREFIX}status`,
    description:
      "Check whether Zernio is reachable and which accounts are connected. Call this first if a Zernio tool fails, to tell an outage apart from a setup problem.",
    input_schema: { type: "object", properties: {} },
  },
];

export function isZernioTool(name: string) {
  return name.startsWith(PREFIX);
}

type Args = Record<string, unknown>;
const str = (a: Args, k: string) => (typeof a[k] === "string" ? (a[k] as string) : undefined);
const plat = (a: Args): Platform => (a.platform === "youtube" ? "youtube" : "instagram");

/**
 * Execute one Zernio tool call and return text for a tool_result block.
 *
 * Failures come back as readable text rather than thrown errors: the model
 * needs to see *why* something is unavailable so it can tell the user, instead
 * of the turn collapsing.
 */
export async function runZernioTool(name: string, args: Args): Promise<string> {
  const tool = name.slice(PREFIX.length);
  try {
    switch (tool) {
      case "list_queue": {
        const view = await queue(plat(args));
        return JSON.stringify(view);
      }
      case "schedule_post": {
        const r = await addPost({
          platform: plat(args),
          caption: str(args, "caption"),
          mediaUrl: str(args, "mediaUrl"),
          mediaType: args.mediaType as "image" | "video" | undefined,
          publishAt: str(args, "publishAt") ?? null,
          useQueue: Boolean(args.useQueue),
          timezone: str(args, "timezone"),
          options: args.options as Record<string, unknown> | undefined,
        });
        return r.ok
          ? JSON.stringify({ scheduled: r.post })
          : unavailable(r.detail, r.needsSetup);
      }
      case "update_scheduled_post": {
        const r = await updatePost(
          String(args.id),
          {
            publishAt: args.publishAt === null ? null : str(args, "publishAt"),
            caption: str(args, "caption"),
            timezone: str(args, "timezone"),
          },
          plat(args),
        );
        return r.ok ? JSON.stringify({ updated: r.post }) : unavailable(r.detail, r.needsSetup);
      }
      case "delete_scheduled_post": {
        const r = await removePost(String(args.id));
        return r.ok ? JSON.stringify({ deleted: true }) : unavailable(r.detail ?? "Failed.", false);
      }
      case "analytics": {
        const metric = String(args.metric);
        const p = String(args.platform ?? "instagram");
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
                        : youtubeRetention(String(args.videoId ?? "")));
        return r.ok ? JSON.stringify(r.data) : unavailable(r.detail, r.needsSetup);
      }
      case "list_automations": {
        const r = await listAutomations();
        return r.ok ? JSON.stringify(r.data) : unavailable(r.detail, r.needsSetup);
      }
      case "create_automation": {
        const r = await createAutomation({
          name: str(args, "name"),
          keywords: (args.keywords as string[]) ?? [],
          dmMessage: String(args.dmMessage ?? ""),
          platformPostId: str(args, "platformPostId"),
          trigger: args.trigger as "comment" | "story_reply" | undefined,
          alsoMatchInDms: Boolean(args.alsoMatchInDms),
        });
        return r.ok ? JSON.stringify(r.data) : unavailable(r.detail, r.needsSetup);
      }
      case "set_automation_active": {
        const r = await setAutomationActive(String(args.id), Boolean(args.isActive));
        return r.ok ? JSON.stringify(r.data) : unavailable(r.detail, r.needsSetup);
      }
      case "delete_automation": {
        const r = await deleteAutomation(String(args.id));
        return r.ok ? JSON.stringify(r.data) : unavailable(r.detail, r.needsSetup);
      }
      case "crosspost": {
        const r = await crossPost({
          content: String(args.content ?? ""),
          mediaUrl: str(args, "mediaUrl"),
          mediaType: args.mediaType as "image" | "video" | undefined,
          targets: (args.targets as { platform: string }[]) ?? [],
          publishAt: str(args, "publishAt") ?? null,
          useQueue: Boolean(args.useQueue),
          timezone: str(args, "timezone"),
        });
        return r.ok ? JSON.stringify(r.data) : unavailable(r.detail, r.needsSetup);
      }
      case "queue_slots": {
        if (args.action === "create") {
          const r = await createQueueSlots({
            name: str(args, "name") ?? "Default",
            timezone: String(args.timezone ?? "UTC"),
            slots: (args.slots as { dayOfWeek: number; hour: number; minute: number }[]) ?? [],
          });
          return r.ok ? JSON.stringify(r.data) : unavailable(r.detail, r.needsSetup);
        }
        const r = await listQueueSlots();
        return r.ok ? JSON.stringify(r.data) : unavailable(r.detail, r.needsSetup);
      }
      case "status": {
        return JSON.stringify(await zernioHealth(true));
      }
      default:
        return `Unknown Zernio tool "${name}".`;
    }
  } catch (error) {
    return unavailable(
      error instanceof Error ? error.message : "Unexpected error calling Zernio.",
      false,
    );
  }
}

function unavailable(detail: string, needsSetup = false) {
  return JSON.stringify({
    error: detail,
    // The model must tell these apart: one the user can fix now, one they
    // cannot. Neither may be papered over with an invented answer.
    kind: needsSetup ? "setup_required" : "zernio_unavailable",
    guidance: needsSetup
      ? "Tell the user what to configure. Do not retry."
      : "Zernio is unavailable, so this capability is off. Say so plainly. Do not substitute another number or claim anything was scheduled.",
  });
}
