import "server-only"
import Stripe from "stripe"

const key = process.env.STRIPE_ACCESS_TOKEN

if (!key) {
  throw new Error("STRIPE_ACCESS_TOKEN is not set")
}

export const stripe = new Stripe(key, {
  apiVersion: "2026-06-24.dahlia",
  typescript: true,
})

// Share of every donation routed to the U.S. Soccer Foundation.
export const FOUNDATION_SHARE = 0.2
