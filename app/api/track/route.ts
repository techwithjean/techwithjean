import { createHash } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

// Salt rotates daily so visitor hashes can't be correlated across days.
function visitorHash(req: NextRequest, day: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  const ua = req.headers.get("user-agent") || "unknown"
  return createHash("sha256").update(`${day}:${ip}:${ua}`).digest("hex")
}

function normalizePath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null
  // Only keep the pathname, drop query/hash, cap length, ignore assets.
  let path = raw.split("?")[0].split("#")[0]
  if (!path.startsWith("/")) path = `/${path}`
  if (path.length > 512) path = path.slice(0, 512)
  if (/\.(png|jpg|jpeg|svg|ico|css|js|json|txt|map|webp)$/i.test(path)) {
    return null
  }
  return path
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const path = normalizePath(body?.path)
    if (!path) return NextResponse.json({ ok: true })

    const day = new Date().toISOString().slice(0, 10)
    const admin = createAdminClient()
    await admin.rpc("record_visit", {
      p_path: path,
      p_visitor: visitorHash(req, day),
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Never let analytics break the page — swallow errors.
    return NextResponse.json({ ok: true })
  }
}
