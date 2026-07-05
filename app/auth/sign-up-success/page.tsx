import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/brand-logo"
import { MailCheckIcon } from "lucide-react"
import Link from "next/link"

export default function Page() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="mb-8 inline-block">
          <BrandLogo className="text-3xl" />
        </Link>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MailCheckIcon className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-balance">
            Check your email to confirm
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            We sent you a confirmation link. Click it to verify your account,
            then log in to start making your bracket predictions.
          </p>
          <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground text-pretty">
            The email comes from{" "}
            <span className="font-medium text-foreground">
              no-reply@myfinalscup.com
            </span>
            . If you don&apos;t see it, check your spam folder.
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
