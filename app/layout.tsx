import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' })
const serif = Instrument_Serif({ weight: '400', subsets: ['latin'], variable: '--font-serif' })

export const metadata: Metadata = {
  title: 'AI Readiness Audit | Transputec x Kuhnic',
  description: 'Your team is losing hundreds of hours a month to work that shouldn\'t exist. Find out exactly where — and what it costs you annually.',
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
