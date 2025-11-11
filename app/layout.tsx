import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TJK Stablemate - Yarış Atı Yönetim Platformu',
  description: 'Yarış atlarınızı ve giderlerinizi kolayca yönetin',
  keywords: 'tjk, yarış atı, at yönetimi, eküri, hipodrom, antrenör',
  authors: [{ name: 'TJK Stablemate' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#2563eb',
  openGraph: {
    title: 'TJK Stablemate',
    description: 'Yarış atlarınızı ve giderlerinizi kolayca yönetin',
    type: 'website',
    locale: 'tr_TR',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}

