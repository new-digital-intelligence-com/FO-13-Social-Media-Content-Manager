import { NextResponse } from "next/server";
import { execute, MEDIA_FIELDS, ME, type Media } from "@/lib/ig";

export const runtime = "nodejs";

/** ?id=<mediaId> for one post (with carousel children + insights), else the list. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id");

  try {
    if (id) {
      const media = await execute<Media>("INSTAGRAM_GET_IG_MEDIA", {
        ig_media_id: id,
        fields: MEDIA_FIELDS,
      });

      // Children and insights are best-effort: a non-carousel has no children,
      // and insights can be unavailable below Meta's reporting threshold.
      const [children, insights] = await Promise.all([
        media.data?.media_type === "CAROUSEL_ALBUM"
          ? execute("INSTAGRAM_GET_IG_MEDIA_CHILDREN", { ig_media_id: id }).catch(
              () => null,
            )
          : Promise.resolve(null),
        execute("INSTAGRAM_GET_IG_MEDIA_INSIGHTS", {
          ig_media_id: id,
          metric: ["views", "reach", "likes", "comments", "shares", "saved"],
        }).catch(() => null),
      ]);

      return NextResponse.json({
        media: media.data,
        children: children?.data ?? null,
        insights: insights?.data ?? null,
        note: media.note ?? insights?.note,
      });
    }

    const limit = Number(params.get("limit") ?? 24);
    const after = params.get("after") ?? undefined;
    const result = await execute<Media[]>("INSTAGRAM_GET_IG_USER_MEDIA", {
      ig_user_id: ME,
      fields: MEDIA_FIELDS,
      limit,
      ...(after ? { after } : {}),
    });

    return NextResponse.json({
      media: Array.isArray(result.data) ? result.data : [],
      note: result.note,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
