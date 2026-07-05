import type { MetadataRoute } from "next"

const siteUrl = "https://www.myfinalscup.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/functional areas out of search results.
        disallow: ["/admin/", "/api/", "/offline", "/auth/update-password"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
