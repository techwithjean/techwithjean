import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Pacifico } from 'next/font/google'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import { InstallPrompt } from '@/components/install-prompt'
import { VisitTracker } from '@/components/visit-tracker'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const pacifico = Pacifico({
  variable: '--font-script',
  weight: '400',
  subsets: ['latin'],
})

const siteUrl = 'https://www.myfinalscup.com'
const siteTitle = 'myFinalsCup.com — 2026 Finals Bracket Challenge'
const siteDescription =
  'Predict every match of the 2026 global soccer finals, climb your private leaderboard, and watch the best highlights and bloopers. 10% of Pro proceeds support youth soccer.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: '%s · myFinalsCup',
  },
  description: siteDescription,
  generator: 'v0.app',
  applicationName: 'myFinalsCup',
  keywords: [
    '2026 finals bracket',
    'soccer prediction game',
    'World Cup bracket challenge',
    'football prediction league',
    'soccer bracket predictor',
    'finals leaderboard',
    'private prediction league',
    'World Cup 2026 predictions',
    'soccer pick em',
    'myFinalsCup',
  ],
  authors: [{ name: 'myFinalsCup' }],
  creator: 'myFinalsCup',
  publisher: 'myFinalsCup',
  category: 'sports',
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'myFinalsCup',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'myFinalsCup',
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'myFinalsCup.com — Predict the 2026 Finals and climb the leaderboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0f1a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pacifico.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': `${siteUrl}/#website`,
                  url: siteUrl,
                  name: 'myFinalsCup',
                  description: siteDescription,
                  inLanguage: 'en-US',
                },
                {
                  '@type': 'Organization',
                  '@id': `${siteUrl}/#organization`,
                  name: 'myFinalsCup',
                  url: siteUrl,
                  logo: `${siteUrl}/icon-512.png`,
                },
                {
                  '@type': 'WebApplication',
                  name: 'myFinalsCup',
                  url: siteUrl,
                  applicationCategory: 'SportsApplication',
                  operatingSystem: 'Web',
                  description: siteDescription,
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                  },
                },
              ],
            }),
          }}
        />
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
        {process.env.NODE_ENV === 'production' && <Analytics />}
        {process.env.NODE_ENV === 'production' && <SpeedInsights />}
        {process.env.NODE_ENV === 'production' && <VisitTracker />}
      </body>
    </html>
  )
}
