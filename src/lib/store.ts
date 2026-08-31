import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Small JSON file store for state Instagram itself cannot hold: the brand
 * voice profile and the scheduled queue. Instagram has no scheduling API, so
 * the queue has to live on our side.
 *
 * Swap for a real database when this serves more than one user -- the shape
 * here is deliberately narrow so that migration is a single file change.
 */
const DIR = path.join(process.cwd(), ".data");

async function file(name: string) {
  await mkdir(DIR, { recursive: true });
  return path.join(DIR, `${name}.json`);
}

export async function readStore<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(await file(name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeStore<T>(name: string, value: T): Promise<void> {
  await writeFile(await file(name), JSON.stringify(value, null, 2), "utf8");
}
