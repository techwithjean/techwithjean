"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import {
  PlayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  curatedClips,
  type ClipCategory,
  type HighlightClip,
} from "@/lib/highlight-clips"

const categoryStyles: Record<ClipCategory, string> = {
  "Goal of the Day": "bg-brand-orange text-white",
  Upset: "bg-brand-red text-white",
  "Best Moments": "bg-brand-blue text-white",
  Featured: "bg-primary text-primary-foreground",
}

// A stable key + poster for either a self-hosted or YouTube clip.
const clipKey = (c: HighlightClip) => c.videoSrc ?? c.youtubeId ?? c.title
const clipPoster = (c: HighlightClip) =>
  c.poster ?? `https://i.ytimg.com/vi/${c.youtubeId}/hqdefault.jpg`

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json() as Promise<{ clips: HighlightClip[] }>)

export function VideoHero() {
  // Auto-updating feed of the latest official World Cup clips, refreshed every
  // 15 minutes. Falls back to the curated list until the feed loads.
  const { data } = useSWR("/api/highlights", fetcher, {
    fallbackData: { clips: curatedClips },
    refreshInterval: 15 * 60_000,
    revalidateOnFocus: false,
  })
  const clips = data?.clips?.length ? data.clips : curatedClips

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Keep the index in range if the feed length changes.
  const safeIndex = index % clips.length
  const clip = clips[safeIndex]

  // Autoplay the featured intro (an advertisement) once on load. It's muted so
  // browsers allow autoplay; viewers can unmute via the controls.
  const didAutoplayRef = useRef(false)
  useEffect(() => {
    if (didAutoplayRef.current) return
    if (clips[0]?.videoSrc) {
      didAutoplayRef.current = true
      setIndex(0)
      setPlaying(true)
    }
  }, [clips])

  // When a self-hosted clip (the ad) finishes, advance to the next clip and
  // return to its poster so the YouTube reel takes over as already configured.
  function handleVideoEnded() {
    setPlaying(false)
    setIndex((i) => (i + 1) % clips.length)
  }

  // Auto-rotate the reel while nothing is actively playing. When the rotation
  // lands back on the featured ad (a self-hosted clip), auto-play it again so
  // the advertisement replays on every loop; other clips just show their poster.
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (playing) return
    rotateRef.current = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % clips.length
        if (clips[next]?.videoSrc) setPlaying(true)
        return next
      })
    }, 6000)
    return () => {
      if (rotateRef.current) clearInterval(rotateRef.current)
    }
  }, [playing, clips.length])

  // Navigating always returns to the clip's cover so the viewer chooses whether
  // to play it — arrows and dots never auto-play the next clip.
  function goTo(next: number) {
    setPlaying(false)
    setIndex((next + clips.length) % clips.length)
  }

  // Return to the cover when the playing clip finishes (via the YouTube iframe
  // API): the player posts an "onStateChange" message with data === 0 (ended).
  useEffect(() => {
    if (!playing) return
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== "https://www.youtube-nocookie.com" &&
        event.origin !== "https://www.youtube.com"
      ) {
        return
      }
      try {
        const payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (payload?.event === "onStateChange" && payload.info === 0) {
          setPlaying(false)
        }
      } catch {
        // Ignore non-JSON messages from the embed.
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [playing])

  return (
    <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      <div className="relative aspect-[16/10] sm:aspect-[21/8]">
        {playing && clip.videoSrc ? (
          <video
            ref={videoRef}
            key={clip.videoSrc}
            className="absolute inset-0 size-full bg-black object-cover"
            src={clip.videoSrc}
            poster={clip.poster}
            playsInline
            onEnded={handleVideoEnded}
            onLoadedMetadata={(e) => {
              // React does not reliably set the `muted` DOM property from the
              // attribute, and browsers block muted autoplay without it — so
              // set it imperatively, then start playback.
              const v = e.currentTarget
              v.muted = true
              void v.play().catch(() => {
                // Autoplay may still be blocked; the user can press play.
              })
            }}
          />
        ) : playing ? (
          <iframe
            ref={iframeRef}
            key={clip.youtubeId}
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${clip.youtubeId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
            title={clip.title}
            allow="accelerated-performance; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            onLoad={() => {
              // Subscribe to player events so we can detect when the clip ends.
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "listening", id: clip.youtubeId }),
                "*",
              )
            }}
          />
        ) : (
          <>
            {/* Thumbnail poster */}
            <img
              src={clipPoster(clip) || "/placeholder.svg"}
              alt={`${clip.title} — ${clip.category}`}
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/25" />

            {/* Top labels */}
            <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2 sm:left-8 sm:top-8">
              <Badge className={categoryStyles[clip.category]}>
                {clip.category}
              </Badge>
              {clip.category !== "Featured" && (
                <Badge
                  variant="outline"
                  className="border-white/20 bg-black/30 text-foreground backdrop-blur"
                >
                  2026 Finals Cup
                </Badge>
              )}
            </div>

            {/* Title */}
            <div className="absolute bottom-6 left-5 max-w-xl sm:bottom-8 sm:left-8">
              <h1 className="text-balance font-heading text-2xl font-extrabold leading-tight sm:text-4xl">
                {clip.title}
              </h1>
              <p className="mt-1 text-pretty text-sm text-muted-foreground sm:text-base">
                {clip.meta}
              </p>
            </div>

            {/* Play button */}
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Play highlight: ${clip.title}`}
              className="group absolute inset-0 flex items-center justify-center"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background/40 transition-transform group-hover:scale-105 sm:size-20">
                <PlayIcon className="ml-1 size-7 sm:size-9" />
              </span>
            </button>
          </>
        )}

        {/* Prev / next — always visible (z-20 so they work over the iframe too) */}
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Previous clip"
          className="absolute left-2 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-foreground backdrop-blur transition-colors hover:bg-black/70 sm:left-3"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Next clip"
          className="absolute right-2 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-foreground backdrop-blur transition-colors hover:bg-black/70 sm:right-3"
        >
          <ChevronRightIcon className="size-5" />
        </button>

        {/* Close player (return to poster) — only while playing */}
        {playing && (
          <button
            type="button"
            onClick={() => setPlaying(false)}
            aria-label="Close video"
            className="absolute right-2 top-2 z-20 flex size-9 items-center justify-center rounded-full bg-black/50 text-foreground backdrop-blur transition-colors hover:bg-black/70 sm:right-3 sm:top-3"
          >
            <XIcon className="size-5" />
          </button>
        )}
      </div>

      {/* Control strip — clip switching stays available while a clip plays */}
      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="min-w-0 truncate text-sm">
          <span className="font-semibold">{clip.title}</span>
          <span className="ml-2 text-muted-foreground">{clip.meta}</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {clips.map((c, i) => (
            <button
              key={clipKey(c)}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show clip ${i + 1}: ${c.title}`}
              aria-current={i === safeIndex}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === safeIndex
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-foreground/30 hover:bg-foreground/60",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
