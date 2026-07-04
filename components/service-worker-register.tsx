"use client"

import { useEffect } from "react"

/**
 * Registers the PWA service worker on the client after the page loads.
 * Only runs in production builds where the service worker is served.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => {
          console.log("[v0] Service worker registration failed:", error)
        })
    }

    window.addEventListener("load", onLoad)
    return () => window.removeEventListener("load", onLoad)
  }, [])

  return null
}
