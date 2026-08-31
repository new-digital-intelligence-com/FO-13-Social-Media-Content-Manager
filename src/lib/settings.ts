import "server-only";
import { readStore, writeStore } from "./store";

export type Settings = {
  /** How the account should sound. Injected into every AI draft. */
  brandVoice: string;
  /** Things the account never says or does. */
  avoid: string;
  /** Target posts per week, used to judge cadence. */
  cadencePerWeek: number;
  /** Topics used to ground content suggestions. */
  topics: string;
  /** Words in a comment or DM that should always be flagged for a human. */
  escalateKeywords: string[];
  /**
   * Publish queued posts at their scheduled time without a per-post approval.
   * The queue decision becomes the approval.
   */
  /** Minutes between background scheduler ticks. */
};

export const DEFAULT_SETTINGS: Settings = {
  brandVoice:
    "Warm, direct and specific. Short sentences. Speaks like a person, not a brand. No hype, no emoji spam.",
  avoid:
    "Inventing prices, availability, shipping times or delivery dates. Making promises on behalf of the business.",
  cadencePerWeek: 3,
  topics: "",
  escalateKeywords: [
    "refund",
    "broken",
    "scam",
    "lawyer",
    "complaint",
    "never received",
    "wrong order",
  ],
};

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await readStore("settings", {})) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await writeStore("settings", next);
  return next;
}

/** The voice block appended to AI drafting prompts. */
export function voicePrompt(settings: Settings): string {
  return [
    `Brand voice: ${settings.brandVoice}`,
    settings.avoid && `Never: ${settings.avoid}`,
    settings.topics && `Account topics: ${settings.topics}`,
  ]
    .filter(Boolean)
    .join("\n");
}
