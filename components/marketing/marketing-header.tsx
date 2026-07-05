import { LogInIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/brand-logo"

/**
 * Lightweight, link-only header for public marketing pages (landing + blog).
 * Unlike SiteHeader it pulls in no client state (no favorite-team context,
 * invite/donate handlers), so it can render in fully static server pages.
 */
export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="/" aria-label="myFinalsCup home">
          <BrandLogo />
        </a>

        <nav className="flex items-center gap-2">
          <Button
            render={<a href="/blog" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Blog
          </Button>
          <Button
            render={<a href="/auth/login" />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <LogInIcon className="size-4" />
            Sign in
          </Button>
          <Button
            render={<a href="/auth/sign-up" />}
            nativeButton={false}
            size="sm"
            className="bg-gradient-to-r from-brand-red to-brand-orange text-white hover:opacity-90"
          >
            Get started
          </Button>
        </nav>
      </div>
    </header>
  )
}
