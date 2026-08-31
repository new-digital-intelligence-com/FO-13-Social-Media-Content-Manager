/**
 * Runs once when the server starts.
 *
 * Deliberately empty: scheduling moved to Zernio, which fires posts on its own
 * servers. The previous in-process timer only published while this process was
 * alive, so a "scheduled" post silently missed its time whenever the app was
 * not running.
 */
export async function register() {}
