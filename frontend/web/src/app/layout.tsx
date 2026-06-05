import React from 'react';
import type { Metadata } from 'next';
import { JetBrains_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PrintCost - Quản lý xưởng in 3D',
  description: 'Hệ thống tính toán giá vốn và quản lý đơn hàng xưởng in 3D',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${jetbrainsMono.variable} ${ibmPlexSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Inject theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const t = localStorage.getItem('printcost-theme') ?? 'dark';
              if (t === 'dark') document.documentElement.classList.add('dark');
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
