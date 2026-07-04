import type { NextRequest } from "next/server"
import type Stripe from "stripe"
import { stripe, FOUNDATION_SHARE } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"

// Stripe needs the raw, unparsed body to verify the signature.
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.log("[v0] STRIPE_WEBHOOK_SECRET is not set")
    return new Response("Webhook not configured", { status: 500 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    console.log("[v0] webhook signature verification failed:", (err as Error).message)
    return new Response("Invalid signature", { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    // Only record donations that were actually paid.
    if (session.payment_status === "paid") {
      const amountCents = session.amount_total ?? 0
      const foundationShareCents = Math.round(amountCents * FOUNDATION_SHARE)
      const metadataUserId = session.metadata?.user_id
      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null

      const supabase = createAdminClient()
      const { error } = await supabase.from("donations").upsert(
        {
          user_id: metadataUserId ? metadataUserId : null,
          stripe_session_id: session.id,
          stripe_payment_intent: paymentIntent,
          donor_email: session.customer_details?.email ?? null,
          amount_cents: amountCents,
          foundation_share_cents: foundationShareCents,
          currency: session.currency ?? "usd",
          status: "completed",
        },
        { onConflict: "stripe_session_id", ignoreDuplicates: true },
      )

      if (error) {
        console.log("[v0] failed to record donation:", error.message)
        // Return 500 so Stripe retries delivery.
        return new Response("Failed to record donation", { status: 500 })
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}
