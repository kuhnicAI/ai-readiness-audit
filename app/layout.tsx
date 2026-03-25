import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display, Geist } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'})
const serif = DM_Serif_Display({ weight: '400', subsets: ['latin'], variable: '--font-serif' })

export const metadata: Metadata = {
  title: 'AI Readiness Audit | Transputec x Kuhnic',
  description: 'Your team is losing hundreds of hours a month to work that shouldn\'t exist. Find out exactly where — and what it costs you annually.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(serif.variable, "font-sans", geist.variable)}>
      <body className="font-sans bg-[#0f0f0f] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
