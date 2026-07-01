"use client"

import { useEffect, useState } from "react"

export type KickoffParts = {
  /** e.g. "Sat, Jun 28" */
  date: string
  /** e.g. "3:00 PM" */
  time: string
  /** short time-zone label, e.g. "EDT" or "GMT+2" */
  zone: string
  /** combined, e.g. "Jun 28 · 3:00 PM EDT" */
  full: string
}

/**
 * Format an absolute ISO instant into a 12-hour, time-zone aware label.
 * Pass `timeZone` to pin the zone; omit it to use the runtime's zone.
 */
export function formatKickoff(iso: string, timeZone?: string): KickoffParts {
  const d = new Date(iso)

  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(d)

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(d)

  // Extract just the short time-zone name (e.g. "EDT", "GMT+2").
  const zonePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    timeZoneName: "short",
    timeZone,
  })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")

  const zone = zonePart?.value ?? "UTC"

  return { date, time, zone, full: `${date} · ${time} ${zone}` }
}

/**
 * Returns the kickoff label rendered in the viewer's own time zone.
 *
 * To stay hydration-safe, both the server and the first client render use a
 * deterministic UTC label; after mount we switch to the visitor's local zone
 * (detected via Intl). This guarantees the SSR markup matches the first paint.
 */
export function useKickoffTime(iso: string): KickoffParts {
  const [timeZone, setTimeZone] = useState<string | undefined>("UTC")

  useEffect(() => {
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTimeZone(undefined)
    }
  }, [])

  return formatKickoff(iso, timeZone)
}
