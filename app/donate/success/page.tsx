import Link from "next/link"
import { HeartHandshakeIcon, ArrowLeftIcon } from "lucide-react"
import { stripe, FOUNDATION_SHARE } from "@/lib/stripe"

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "usd",
  }).format(cents / 100)
}

export default async function DonateSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  let amountCents: number | null = null
  let confirmed = false

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id)
      if (session.payment_status === "paid") {
        confirmed = true
        amountCents = session.amount_total ?? null
      }
    } catch {
      confirmed = false
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent/15">
          <HeartHandshakeIcon className="size-7 text-accent" />
        </div>

        {confirmed ? (
          <>
            <h1 className="font-heading text-2xl font-bold text-foreground text-balance">
              Thank you for your donation!
            </h1>
            {amountCents !== null && (
              <p className="mt-3 text-muted-foreground text-pretty">
                Your gift of{" "}
                <span className="font-semibold text-foreground">
                  {formatUsd(amountCents)}
                </span>{" "}
                helps keep myFinalsCup running.{" "}
                <span className="font-semibold text-foreground">
                  {formatUsd(Math.round(amountCents * FOUNDATION_SHARE))}
                </span>{" "}
                ({Math.round(FOUNDATION_SHARE * 100)}%) goes to the U.S. Soccer
                Foundation to support youth soccer.
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="font-heading text-2xl font-bold text-foreground text-balance">
              We couldn&apos;t confirm your donation
            </h1>
            <p className="mt-3 text-muted-foreground text-pretty">
              If you completed a payment, it may still be processing. No charge
              was made if you cancelled.
            </p>
          </>
        )}

        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-brand-red to-brand-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <ArrowLeftIcon className="size-4" />
          Back to myFinalsCup
        </Link>
      </div>
    </main>
  )
}
