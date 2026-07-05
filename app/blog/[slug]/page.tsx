import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { BlogContent } from "@/components/marketing/blog-content"
import { getAllPosts, getPostBySlug } from "@/lib/blog/posts"

const siteUrl = "https://www.myfinalscup.com"

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: "Post not found" }

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "myFinalsCup",
      logo: { "@type": "ImageObject", url: `${siteUrl}/icon-512.png` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/blog/${post.slug}`,
    },
  }

  return (
    <div className="min-h-dvh bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <MarketingHeader />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <a
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          All articles
        </a>

        <article className="mt-6">
          <header className="border-b border-border pb-8">
            <h1 className="text-balance font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                {formatDate(post.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                {post.readingMinutes} min read
              </span>
              <span>By {post.author}</span>
            </div>
          </header>

          <div className="mt-8">
            <BlogContent content={post.content} />
          </div>
        </article>

        {/* Post-article CTA */}
        <aside className="mt-12 rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
          <h2 className="text-balance font-heading text-xl font-bold tracking-tight">
            Put it to the test this tournament
          </h2>
          <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-muted-foreground">
            Create a free account, start a private league, and make your first
            predictions before the next kickoff.
          </p>
          <div className="mt-5 flex justify-center">
            <Button
              render={<a href="/auth/sign-up" />}
              nativeButton={false}
              className="bg-gradient-to-r from-brand-red to-brand-orange text-white hover:opacity-90"
            >
              Start predicting free
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </aside>
      </main>

      <MarketingFooter />
    </div>
  )
}
