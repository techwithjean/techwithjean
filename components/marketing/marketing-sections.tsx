import Image from "next/image"
import {
  TrophyIcon,
  UsersIcon,
  TargetIcon,
  RadioIcon,
  ShieldCheckIcon,
  HeartHandshakeIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const STEPS = [
  {
    icon: UsersIcon,
    title: "Create or join a league",
    body: "Start a private league in seconds and invite friends, family, or coworkers with a single link. No spreadsheets, no group-chat chaos.",
  },
  {
    icon: TargetIcon,
    title: "Predict every match",
    body: "Call the score of each fixture from the group stage to the final. Lock in your picks before kickoff and tweak them as the bracket unfolds.",
  },
  {
    icon: TrophyIcon,
    title: "Climb the leaderboard",
    body: "Earn points for correct outcomes and exact scores, then watch your live ranking rise as results roll in during the 2026 finals.",
  },
]

const FEATURES = [
  {
    icon: RadioIcon,
    title: "Live scores & auto-grading",
    body: "Real match data updates the bracket automatically and grades everyone's predictions the moment a game goes final.",
  },
  {
    icon: UsersIcon,
    title: "Unlimited private leagues",
    body: "Run a league with your friends, another with the office, and a third with the family. Switch between them anytime.",
  },
  {
    icon: TargetIcon,
    title: "Exact-score bonus points",
    body: "Nail the outcome for points, or predict the exact scoreline for the bonus. Every match matters right down to the final.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Free to play",
    body: "No cost to create an account, make predictions, or invite your whole crew. Play the entire tournament on us.",
  },
  {
    icon: HeartHandshakeIcon,
    title: "Plays for good",
    body: "20% of every optional donation supports the U.S. Soccer Foundation and youth soccer in under-resourced communities.",
  },
  {
    icon: RadioIcon,
    title: "Works on any device",
    body: "Install it like an app on your phone or play in any browser. Your bracket and standings follow you everywhere.",
  },
]

const FAQS = [
  {
    q: "What is myFinalsCup?",
    a: "myFinalsCup is a free online bracket challenge and prediction game for the 2026 global soccer finals. You predict the score of every match, compete in private leagues with friends, and climb a live leaderboard as real results come in.",
  },
  {
    q: "How much does it cost to play?",
    a: "It is completely free to create an account, make your predictions, start leagues, and invite friends. Donations are optional, and 20% of every donation goes to the U.S. Soccer Foundation.",
  },
  {
    q: "How do points work?",
    a: "You earn points for correctly predicting the outcome of a match, with bonus points for calling the exact scoreline. Predictions are graded automatically as soon as each match is final.",
  },
  {
    q: "Can I play in a private league with my friends?",
    a: "Yes. You can create unlimited private leagues and invite people with a single shareable link. Everyone who joins competes on the same leaderboard, and you can belong to as many leagues as you like.",
  },
  {
    q: "Do I need to know a lot about soccer?",
    a: "Not at all. Anyone can play — predicting scores is simple and fun whether you are a die-hard fan or just following along for the finals with friends.",
  },
]

/**
 * The public, crawlable marketing content (value prop, how-it-works, features,
 * FAQ, CTA). Rendered below the live bracket for logged-out visitors and reused
 * by the standalone landing route. No header/footer so it can be slotted into
 * the app shell.
 */
export function MarketingSections() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <section aria-label="About myFinalsCup" className="border-t border-border">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero / value proposition */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <Image
            src="/landing-hero.png"
            alt=""
            fill
            className="object-cover object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-orange/40 bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-orange">
            <TrophyIcon className="size-3.5" />
            The 2026 Finals Bracket Challenge
          </span>
          <h2 className="max-w-2xl text-balance font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Predict the 2026 finals.{" "}
            <span className="bg-gradient-to-r from-brand-red to-brand-orange bg-clip-text text-transparent">
              Beat your friends.
            </span>
          </h2>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Play along above for free — no account needed to explore the
            bracket. Create a free account to save your predictions, run private
            leagues with friends, and climb a live leaderboard all the way to
            the trophy.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              render={<a href="/auth/sign-up" />}
              nativeButton={false}
              size="lg"
              className="bg-gradient-to-r from-brand-red to-brand-orange text-white hover:opacity-90"
            >
              Create your free account
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button
              render={<a href="#how-it-works" />}
              nativeButton={false}
              size="lg"
              variant="outline"
            >
              See how it works
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
            {["Free to play", "No app store needed", "Set up in 60 seconds"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-brand-green" />
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      {/* How it works */}
      <div
        id="how-it-works"
        className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            How the bracket challenge works
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            From sign-up to bragging rights in three simple steps.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <step.icon className="size-5" />
              </span>
              <span className="absolute right-6 top-6 font-heading text-4xl font-extrabold text-border">
                {i + 1}
              </span>
              <h3 className="font-heading text-lg font-semibold">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Features */}
      <div className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run the perfect pool
            </h2>
            <p className="mt-4 text-pretty text-muted-foreground">
              Built for fans who want the finals to be more fun with friends.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-6"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="font-heading text-base font-semibold">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="text-center text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
        <dl className="mt-10 flex flex-col gap-4">
          {FAQS.map((faq) => (
            <div
              key={faq.q}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <dt className="font-heading text-lg font-semibold">{faq.q}</dt>
              <dd className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Final CTA */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <TrophyIcon className="mx-auto size-10 text-brand-yellow drop-shadow-[0_0_10px_oklch(0.86_0.17_95_/_0.4)]" />
          <h2 className="mt-6 text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to prove you know soccer?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            Create your free account, start a league, and save your predictions
            before the next kickoff.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              render={<a href="/auth/sign-up" />}
              nativeButton={false}
              size="lg"
              className="bg-gradient-to-r from-brand-red to-brand-orange text-white hover:opacity-90"
            >
              Create your free account
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
