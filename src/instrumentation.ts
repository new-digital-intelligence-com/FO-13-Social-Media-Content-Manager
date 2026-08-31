/**
 * Runs once when the server starts. Used to bring up the background publisher
 * so scheduled posts fire without anyone having the app open.
 */
export async function register() {
  // Guard against the edge runtime, where timers and the file store are absent.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startScheduler } = await import("./lib/scheduler");
  await startScheduler();
}
