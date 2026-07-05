"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrandLogo } from "@/components/brand-logo"
import { getAuthCallbackUrl } from "@/lib/auth-redirect"
import { MailCheckIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function Page() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // Route the recovery link through the callback, which exchanges the code
      // for a session and then forwards to the update-password page.
      const redirectTo = getAuthCallbackUrl("/auth/update-password")

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      if (error) throw error
      setSent(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Link href="/">
            <BrandLogo className="text-3xl" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Reset your password</h1>
            <p className="text-sm text-muted-foreground text-pretty">
              Enter your email and we&apos;ll send you a link to set a new
              password
            </p>
          </div>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MailCheckIcon className="size-6" />
            </div>
            <h2 className="text-lg font-bold text-balance">Check your email</h2>
            <p className="text-sm text-muted-foreground text-pretty">
              {"If an account exists for "}
              <span className="font-medium text-foreground">{email}</span>
              {", you'll receive a link to reset your password shortly."}
            </p>
            <Button
              render={<Link href="/auth/login" />}
              nativeButton={false}
              variant="outline"
              className="mt-2 w-full"
            >
              Back to login
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleReset}
            className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending link..." : "Send reset link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {"Remember your password? "}
              <Link
                href="/auth/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
