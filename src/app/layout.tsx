import type { Metadata } from 'next'
import { Newsreader, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import FaroInit from '@/components/observability/FaroInit'
import FaroUserSync from '@/components/observability/FaroUserSync'

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Winchburgh Speakers Club',
  description: 'A friendly community of speakers in Winchburgh, West Lothian.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <FaroInit />
        <FaroUserSync />
      </body>
    </html>
  )
}
