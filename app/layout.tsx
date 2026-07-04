import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Pacifico } from 'next/font/google'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import { InstallPrompt } from '@/components/install-prompt'
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

export const metadata: Metadata = {
  title: 'myFinalsCup.com — 2026 Finals Bracket Challenge',
  description:
    'Predict every match of the 2026 global soccer finals, climb your private leaderboard, and watch the best highlights and bloopers. 10% of Pro proceeds support youth soccer.',
  generator: 'v0.app',
  applicationName: 'myFinalsCup',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'myFinalsCup',
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
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
