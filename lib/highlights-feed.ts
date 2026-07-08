import https from "node:https"
import {
  categorizeClip,
  curatedClips,
  type HighlightClip,
} from "@/lib/highlight-clips"

// Official broadcaster/rights-holder YouTube channels. Their public RSS feeds
// require no API key and update automatically as new clips are posted.
const FEED_CHANNELS = [
  "UCooTLkxcpnTNx6vfOovfBFA", // FOX Soccer (2026 World Cup US rights-holder)
]

// Only surface World Cup content (the channels also post other competitions).
const WC_INCLUDE =
  /world cup|round of (?:32|16)|quarter.?final|semi.?final|\bfinal\b|group [a-l]\b|knockout|world.?cup/i
const NON_WC_EXCLUDE =
  /\bMLS\b|NWSL|Bundesliga|Premier League|LaLiga|La Liga|Serie A|Ligue 1|Champions League|Europa League|Concacaf|Liga MX/i

// Actual match action (goals, results, highlights) vs. studio/talk segments.
const HIGHLIGHT_SIGNAL =
  /highlights|game.?winner|scores?|brace|hat.?trick|golazo|goal|stunner|winner|moves on|sends|advance|knocked out|\bvs\.?\b|\d+\s*-\s*\d+|penalt|free.?kick|equali[sz]er/i
const STUDIO_EXCLUDE =
  /reaction|compare|is it fair|race between|getting to watch|stand by|introducing|who would|debate|analysis|breakdown|preview|press conference|interview|explained|\btalk\b|q&a|mailbag|power ranking|predict|on this day|throwback|years? ago|\bclassic\b|20(?:0\d|1\d)\b/i

// Total reel size: 1 featured intro + 5 latest clips.
const MAX_CLIPS = 6

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

type FeedEntry = { youtubeId: string; title: string; published: string }

function parseFeed(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = []
  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []
  for (const block of blocks) {
    const id = block.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1]
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const published = block.match(/<published>(.*?)<\/published>/)?.[1]
    if (id && title) {
      entries.push({
        youtubeId: id,
        title: decodeEntities(title.trim()),
        published: published ?? "",
      })
    }
  }
  return entries
}

// Raw HTTPS GET via Node's https module. We intentionally avoid the global
// `fetch` here because Next.js patches and memoizes identical fetch calls,
// which would collapse our retry attempts into a single network request.
function httpsGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept:
            "application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: 8000,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (c) => chunks.push(c as Buffer))
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        )
      },
    )
    req.on("timeout", () => req.destroy(new Error("timeout")))
    req.on("error", reject)
  })
}

async function fetchChannelEntries(channelId: string): Promise<FeedEntry[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  // YouTube's bot detection intermittently 404s server-side feed requests (the
  // first hit is often cold), so retry several times — these are genuinely
  // separate network calls and usually succeed within a few attempts.
  let lastStatus = 0
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const { status, body } = await httpsGet(url)
      if (status === 200) return parseFeed(body)
      lastStatus = status
    } catch {
      lastStatus = -1
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
  }
  throw new Error(`Feed ${channelId} returned ${lastStatus}`)
}

// --- Cache -----------------------------------------------------------------
// The RSS feeds update at most a few times per hour, so cache for 15 minutes.
const CACHE_TTL_MS = 15 * 60_000
let cached: HighlightClip[] | null = null
let cachedAt = 0
let inFlight: Promise<HighlightClip[]> | null = null

export async function getHighlightClips(): Promise<HighlightClip[]> {
  const now = Date.now()
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached
  if (inFlight) return inFlight

  inFlight = buildClips()
    .then((clips) => {
      cached = clips
      cachedAt = Date.now()
      return clips
    })
    .catch((err) => {
      console.log("[v0] highlights feed error:", (err as Error).message)
      return cached ?? curatedClips
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

async function buildClips(): Promise<HighlightClip[]> {
  const results = await Promise.allSettled(
    FEED_CHANNELS.map(fetchChannelEntries),
  )
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<FeedEntry[]> => r.status === "fulfilled",
  )
  // If every feed failed, throw so we serve the fallback WITHOUT caching it —
  // the next request retries promptly instead of waiting out the cache TTL.
  if (fulfilled.length === 0) {
    throw new Error("All highlight feeds failed")
  }
  const entries = fulfilled.flatMap((r) => r.value)

  // Newest first.
  entries.sort((a, b) => b.published.localeCompare(a.published))

  // World-Cup, non-studio entries, newest first.
  const wcEntries = entries.filter(
    (e) => WC_INCLUDE.test(e.title) && !NON_WC_EXCLUDE.test(e.title),
  )

  // Real match action (goals, results) vs. other non-studio WC clips (toasts,
  // "on this day", hype, etc.). We build the reel deliberately: mostly recent
  // matches, plus at most one non-match item so the feed still feels live.
  const matchEntries = wcEntries.filter(
    (e) => HIGHLIGHT_SIGNAL.test(e.title) && !STUDIO_EXCLUDE.test(e.title),
  )
  const otherEntries = wcEntries.filter(
    (e) => !HIGHLIGHT_SIGNAL.test(e.title) && !STUDIO_EXCLUDE.test(e.title),
  )

  const toClip = (e: FeedEntry): HighlightClip => ({
    youtubeId: e.youtubeId,
    category: categorizeClip(e.title),
    title: e.title,
    meta: formatMeta(e.published),
  })

  // Self-hosted "Featured" clips (e.g. the branded intro) always lead the reel.
  const featured = curatedClips.filter((c) => c.videoSrc)
  const seen = new Set<string>()

  // Recent match clips: live feed first (newest), then top up from curated.
  const matchClips: HighlightClip[] = []
  for (const e of matchEntries) {
    if (seen.has(e.youtubeId)) continue
    seen.add(e.youtubeId)
    matchClips.push(toClip(e))
  }
  for (const c of curatedClips) {
    if (!c.youtubeId || seen.has(c.youtubeId)) continue
    seen.add(c.youtubeId)
    matchClips.push(c)
  }

  // At most one non-match item (the newest), to keep the reel feeling live.
  const NON_MATCH_LIMIT = 1
  const nonMatchClips: HighlightClip[] = []
  for (const e of otherEntries) {
    if (nonMatchClips.length >= NON_MATCH_LIMIT) break
    if (seen.has(e.youtubeId)) continue
    seen.add(e.youtubeId)
    nonMatchClips.push(toClip(e))
  }

  // Fill the 5 non-featured slots: reserve one for the non-match item, the
  // rest go to recent matches.
  const slots = MAX_CLIPS - featured.length
  const nonMatchPick = nonMatchClips.slice(0, NON_MATCH_LIMIT)
  const matchPick = matchClips.slice(0, Math.max(0, slots - nonMatchPick.length))
  const clips: HighlightClip[] = [...featured, ...matchPick, ...nonMatchPick]

  // If filtering left us empty (e.g. off-season), fall back to curated clips.
  return clips.length > 0 ? clips : curatedClips
}

function formatMeta(published: string): string {
  if (!published) return "Official highlights"
  const d = new Date(published)
  if (Number.isNaN(d.getTime())) return "Official highlights"
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d)
  return `${date} · Official highlights`
}
