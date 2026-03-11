import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { OwnCompanyProvider } from '@/contexts/OwnCompanyContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OfferGen - B2B Ajánlatkészítő Platform',
  description: 'Autonóm B2B ajánlatkészítő és kiküldés-előkészítő platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="hu">
      <body className={inter.className}>
        <OwnCompanyProvider>{children}</OwnCompanyProvider>
      </body>
    </html>
  )
}
