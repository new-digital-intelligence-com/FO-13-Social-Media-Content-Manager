import "server-only";
import { NextResponse } from "next/server";
import { SetupRequiredError, explainXError } from "./x";

/** Shared error handling so every X route reports setup and X quirks alike. */
export async function xRoute<T>(run: () => Promise<T>) {
  try {
    return NextResponse.json(await run());
  } catch (error) {
    if (error instanceof SetupRequiredError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: explainXError(message) }, { status: 500 });
  }
}
