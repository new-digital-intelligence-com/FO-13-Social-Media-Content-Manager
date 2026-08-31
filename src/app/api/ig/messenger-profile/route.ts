import { NextResponse } from "next/server";
import { execute, ME } from "@/lib/ig";

export const runtime = "nodejs";

/**
 * Ice breakers: the tappable prompts shown before a DM conversation starts.
 * This is the only part of the Instagram profile Meta lets an app change --
 * the bio, name, website and picture have no API at all.
 */
export async function GET() {
  try {
    const profile = await execute("INSTAGRAM_GET_MESSENGER_PROFILE", {
      ig_user_id: ME,
    });
    return NextResponse.json({ profile: profile.data, note: profile.note });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { iceBreakers } = (await request.json()) as {
      iceBreakers: { question: string; payload?: string }[];
    };
    if (!Array.isArray(iceBreakers) || iceBreakers.length === 0) {
      return NextResponse.json({ error: "iceBreakers is required." }, { status: 400 });
    }
    if (iceBreakers.length > 4) {
      return NextResponse.json(
        { error: "Instagram allows at most 4 ice breakers." },
        { status: 400 },
      );
    }
    // An update replaces the whole set, so callers must send the full list.
    const updated = await execute("INSTAGRAM_UPDATE_MESSENGER_PROFILE", {
      ig_user_id: ME,
      ice_breakers: iceBreakers,
    });
    return NextResponse.json({ ok: true, result: updated.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const deleted = await execute("INSTAGRAM_DELETE_MESSENGER_PROFILE", {
      ig_user_id: ME,
      fields: ["ice_breakers"],
    });
    return NextResponse.json({ ok: true, result: deleted.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
