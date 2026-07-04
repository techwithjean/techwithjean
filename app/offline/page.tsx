import type { Metadata } from "next"
import { WifiOffIcon } from "lucide-react"

export const metadata: Metadata = {
  title: "Offline — myFinalsCup",
  description: "You are currently offline.",
}

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <WifiOffIcon className="size-8 text-muted-foreground" />
      </div>
      <h1 className="text-balance text-2xl font-semibold text-foreground">
        You&apos;re offline
      </h1>
      <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
        myFinalsCup needs an internet connection to load live brackets and
        leaderboards. Reconnect and try again.
      </p>
    </main>
  )
}
