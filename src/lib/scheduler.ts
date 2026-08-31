import "server-only";
import { readStore, writeStore } from "./store";
import { getSettings } from "./settings";
import { runDuePosts } from "./publish-queue";

/**
 * Background publisher.
 *
 * Instagram has no scheduling API, so something on our side has to fire due
 * posts. Driving that from the browser meant nothing published unless a tab
 * was open, which is not a schedule. This ticks inside the server process
 * instead, so a queued post goes out whether or not anyone is looking.
 *
 * Suits a long-running server (dev, a VM, a container). On serverless, where
 * the process is torn down between requests, point a cron job at
 * POST /api/ig/schedule/run instead.
 */
let timer: NodeJS.Timeout | null = null;
let running = false;

export type SchedulerState = {
  active: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  lastPublished: number;
  lastError: string | null;
};

const state: SchedulerState = {
  active: false,
  intervalMinutes: 1,
  lastRunAt: null,
  lastPublished: 0,
  lastError: null,
};

/**
 * State is persisted rather than kept in memory.
 *
 * Next isolates module instances between the startup hook and route handlers,
 * so an in-memory flag set by the scheduler is invisible to the API that
 * reports on it -- which made a running scheduler look stopped. The file store
 * is the one thing both contexts share.
 */
const STATE_KEY = "scheduler";

async function persist() {
  await writeStore(STATE_KEY, state).catch(() => {});
}

export async function schedulerState(): Promise<SchedulerState> {
  const stored = await readStore<Partial<SchedulerState>>(STATE_KEY, {});
  return { ...state, ...stored };
}

async function tick() {
  // A slow publish must not overlap the next tick and double-post.
  if (running) return;
  running = true;
  try {
    const result = await runDuePosts();
    state.lastRunAt = new Date().toISOString();
    state.lastPublished = result.ran.filter((r) => r.status === "published").length;
    state.lastError = null;
    await persist();
    if (result.ran.length > 0) {
      console.log(
        `[scheduler] published ${state.lastPublished}/${result.ran.length} due post(s)`,
      );
    }
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : "Unknown error";
    await persist();
    // Never rethrow: an unhandled rejection here would kill the interval and
    // silently stop all future publishing.
    console.error("[scheduler] run failed:", state.lastError);
  } finally {
    running = false;
  }
}

export async function startScheduler() {
  if (timer) return;
  const settings = await getSettings().catch(() => null);
  const minutes = Math.max(settings?.schedulerIntervalMinutes ?? 1, 1);

  state.active = true;
  state.intervalMinutes = minutes;

  timer = setInterval(tick, minutes * 60_000);
  // Don't hold the process open on shutdown.
  timer.unref?.();

  await persist();
  console.log(`[scheduler] started, checking every ${minutes} min`);
  void tick();
}
