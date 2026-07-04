"use client"

import { useEffect, useState } from "react"
import { DownloadIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "mfc-install-dismissed"

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.sessionStorage.getItem(DISMISS_KEY)) return

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    const onInstalled = () => {
      setVisible(false)
      setDeferred(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setVisible(false)
    setDeferred(null)
  }

  function handleDismiss() {
    setVisible(false)
    window.sessionStorage.setItem(DISMISS_KEY, "1")
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-brand-red to-brand-orange">
          <DownloadIcon className="size-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-card-foreground">
            Install myFinalsCup
          </p>
          <p className="text-xs text-muted-foreground">
            Add to your home screen for quick access.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleInstall}
          className="bg-gradient-to-r from-brand-red to-brand-orange text-white hover:opacity-90"
        >
          Install
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}
