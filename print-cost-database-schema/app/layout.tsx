import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { JetBrains_Mono, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-ibm-plex-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PrintCost - Quản lý Xưởng In 3D',
  description: 'Hệ thống quản lý chi phí và đơn hàng cho xưởng in 3D',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="vi"
      className={`dark ${jetbrainsMono.variable} ${ibmPlexSans.variable}`}
    >
      <body className="font-sans antialiased bg-background">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
