"use server"

import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

const MIN_DOLLARS = 1
const MAX_DOLLARS = 10000

type CheckoutResult = { url?: string; error?: string }

// Creates a Stripe Checkout session for a variable-amount donation.
// The amount is validated server-side so it can't be tampered with.
export async function createDonationCheckout(
  amountDollars: number,
  donorName?: string,
): Promise<CheckoutResult> {
  const amount = Math.round(Number(amountDollars))

  if (!Number.isFinite(amount) || amount < MIN_DOLLARS || amount > MAX_DOLLARS) {
    return { error: "Please enter an amount between $1 and $10,000." }
  }

  // Optional display name for anonymous donors. Trim and cap length so it
  // can't be abused as a large free-text field.
  const cleanName = (donorName ?? "").trim().slice(0, 80)

  // Attribute the donation to the signed-in user when there is one.
  let userId: string | null = null
  let userEmail: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
    userEmail = user?.email ?? null
  } catch {
    // Anonymous donations are allowed; ignore auth lookup failures.
  }

  // Build an absolute base URL for success/cancel redirects.
  const hdrs = await headers()
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host")
  const proto = hdrs.get("x-forwarded-proto") ?? "https"
  const origin = host ? `${proto}://${host}` : ""

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "donate",
      customer_email: userEmail ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Donation to Kids Soccer",
              description:
                "Supports myFinalsCup hosting. 20% goes to the U.S. Soccer Foundation.",
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        purpose: "kids_soccer_donation",
        amount_dollars: String(amount),
        user_id: userId ?? "",
        // Prefer a real signed-in user; fall back to the name they typed.
        donor_name: cleanName,
      },
      success_url: `${origin}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    })

    if (!session.url) {
      return { error: "Could not start checkout. Please try again." }
    }

    return { url: session.url }
  } catch (err) {
    console.log("[v0] donation checkout error:", (err as Error).message)
    return { error: "Could not start checkout. Please try again." }
  }
}
