import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' })
const serif = Instrument_Serif({ weight: '400', subsets: ['latin'], variable: '--font-serif' })

export const metadata: Metadata = {
  title: 'AI Readiness Audit | Kuhnic',
  description: 'Find out what inefficiency is costing your business. Takes 60 seconds. Free. No sales call.',
  metadataBase: new URL('https://audit.kuhnic.ai'),
  openGraph: {
    title: 'AI Readiness Audit | Kuhnic',
    description: 'Find out what inefficiency is costing your business. Takes 60 seconds. Free. No sales call.',
    url: 'https://audit.kuhnic.ai',
    siteName: 'Kuhnic AI',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AI Readiness Audit by Kuhnic' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Readiness Audit | Kuhnic',
    description: 'Find out what inefficiency is costing your business. Takes 60 seconds.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(sans.variable, serif.variable)}>
      <body className="font-sans bg-white text-[#1a1a2e] antialiased">
        {children}
      </body>
    </html>
  )
}
