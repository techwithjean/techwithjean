import { NextResponse } from "next/server"
import { getHighlightClips } from "@/lib/highlights-feed"
import { curatedClips } from "@/lib/highlight-clips"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const clips = await getHighlightClips()
    return NextResponse.json(
      { clips },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (err) {
    console.log("[v0] /api/highlights error:", (err as Error).message)
    // Never fail the hero — fall back to curated clips.
    return NextResponse.json({ clips: curatedClips })
  }
}
