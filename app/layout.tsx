import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ekurim.com.tr'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'EKÜRİM - Yarış Atı Yönetim Platformu',
  description: 'Yarış atlarınızı ve giderlerinizi kolayca yönetin',
  keywords: 'tjk, yarış atı, at yönetimi, eküri, hipodrom, antrenör',
  authors: [{ name: 'EKÜRİM' }],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  openGraph: {
    title: 'EKÜRİM',
    description: 'Yarış atlarınızı ve giderlerinizi kolayca yönetin',
    type: 'website',
    locale: 'tr_TR',
    url: appUrl,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#6366f1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        {children}
        <Toaster 
          position="top-right" 
          richColors
          toastOptions={{
            className: 'ekurim-toast',
          }}
          closeButton
          expand={true}
          duration={4000}
        />
      </body>
    </html>
  )
}

