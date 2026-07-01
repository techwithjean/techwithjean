import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/brand-logo"
import { TriangleAlertIcon } from "lucide-react"
import Link from "next/link"

export default function Page() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="mb-8 inline-block">
          <BrandLogo className="text-3xl" />
        </Link>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <TriangleAlertIcon className="size-6" />
          </div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            We couldn&apos;t complete your authentication. The link may have
            expired or already been used.
          </p>
          <Button
            render={<Link href="/auth/login" />}
            nativeButton={false}
            className="mt-2 w-full"
          >
            Back to login
          </Button>
        </div>
      </div>
    </main>
  )
}
