import { NextResponse } from "next/server"
import { getBracket } from "@/lib/football-data"

// Live scores must never be statically cached.
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const bracket = await getBracket()
    return NextResponse.json(bracket, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (err) {
    console.log("[v0] /api/bracket error:", (err as Error).message)
    return NextResponse.json(
      { error: "Failed to load live bracket" },
      { status: 502 },
    )
  }
}
