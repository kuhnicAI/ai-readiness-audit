'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

function Counter({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const triggered = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !triggered.current) {
        triggered.current = true
        const duration = 1500
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setValue(Math.round(eased * end))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [end])

  return <span ref={ref}>{prefix}{value}{suffix}</span>
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* ═══ FIXED NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f]/80 backdrop-blur-lg border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 h-14 flex items-center justify-between">
          <div>
            <Image src="/kuhnic-logo.svg" alt="Kuhnic" width={90} height={24} className="h-[20px] w-auto brightness-0 invert opacity-80" />
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[8px] text-[#444]">powered by</span>
              <Image src="/transputec-logo.svg" alt="Transputec" width={55} height={7} className="h-[6px] w-auto brightness-0 invert opacity-30" />
            </div>
          </div>
          <Link
            href="/audit"
            className="rounded-full bg-[#00D084] px-5 py-2 text-[13px] font-semibold text-[#0f0f0f] hover:bg-[#00e090] transition-colors"
          >
            Start My Audit
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-28 md:pt-36 pb-20 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-[2px] bg-[#00D084]" />
          <span className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[#00D084]">AI Readiness Audit</span>
        </div>

        <h1 className="text-[clamp(2.2rem,5.5vw,3.8rem)] leading-[1.1] font-serif text-[#f5f0eb] max-w-4xl">
          Your team is losing{' '}
          <em className="text-[#00D084] italic">hundreds of hours</em>{' '}
          a month to work that shouldn&rsquo;t exist.
        </h1>

        <p className="mt-6 text-[clamp(1rem,1.8vw,1.15rem)] text-[#666] max-w-2xl leading-relaxed">
          We&rsquo;ll tell you exactly where &mdash; what it costs you annually &mdash; and
          what fixing it actually looks like. Takes 7 minutes.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Link
            href="/audit"
            className="rounded-full bg-[#00D084] px-8 py-4 text-[15px] font-semibold text-[#0f0f0f] hover:bg-[#00e090] transition-colors"
          >
            Show Me the Numbers &nbsp;&rarr;
          </Link>
          <span className="text-[13px] text-[#444]">
            Free &middot; Confidential &middot; No sales call required
          </span>
        </div>
      </section>

      {/* ═══ TRUST BAR ═══ */}
      <section className="border-y border-[#1a1a1a] bg-[#111]">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-[clamp(2rem,4vw,2.8rem)] font-serif text-white">
              <Counter end={100} suffix="+" />
            </p>
            <p className="mt-1 text-[12px] text-[#555] uppercase tracking-wider">Audits completed</p>
          </div>
          <div>
            <p className="text-[clamp(2rem,4vw,2.8rem)] font-serif text-white">
              <Counter end={10} prefix="£" suffix="M+" />
            </p>
            <p className="mt-1 text-[12px] text-[#555] uppercase tracking-wider">Saved for clients</p>
          </div>
          <div>
            <p className="text-[clamp(2rem,4vw,2.8rem)] font-serif text-white">
              <Counter end={7} suffix=" min" />
            </p>
            <p className="mt-1 text-[12px] text-[#555] uppercase tracking-wider">To complete</p>
          </div>
          <div>
            <p className="text-[clamp(2rem,4vw,2.8rem)] font-serif text-white">
              Instant
            </p>
            <p className="mt-1 text-[12px] text-[#555] uppercase tracking-wider">Report turnaround</p>
          </div>
        </div>
      </section>

      {/* ═══ WHAT YOU GET ═══ */}
      <section className="max-w-5xl mx-auto px-6 md:px-12 py-20">
        <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#444] mb-10">What you get</p>
        <div className="space-y-5">
          <p className="text-[clamp(1.4rem,3vw,2.2rem)] font-serif text-[#f5f0eb] leading-snug">
            Your exact annual waste number.
          </p>
          <p className="text-[clamp(1.4rem,3vw,2.2rem)] font-serif text-[#f5f0eb] leading-snug">
            The three fixes ranked by ROI.
          </p>
          <p className="text-[clamp(1.4rem,3vw,2.2rem)] font-serif text-[#f5f0eb] leading-snug">
            A report ready to share with leadership.
          </p>
        </div>
      </section>

      {/* ═══ CASE STUDIES ═══ */}
      <section className="border-t border-[#1a1a1a] bg-[#111]">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-20">
          <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#444] mb-12">
            Companies that audited &mdash; then acted
          </p>

          {/* Asymmetric editorial layout */}
          <div className="grid md:grid-cols-5 gap-4">
            {/* Feature card — spans 3 cols */}
            <div className="md:col-span-3 rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] px-8 py-10 flex flex-col justify-end">
              <p className="text-[clamp(4rem,8vw,6rem)] font-serif text-white leading-none">90%</p>
              <p className="mt-3 text-[18px] font-bold text-[#e5e0d8]">Less admin work</p>
              <p className="mt-3 text-[14px] text-[#666] leading-relaxed max-w-md">
                Law firm drowning in manual client intake. We automated the entire flow &mdash;
                780 hours reclaimed annually, 25% more clients without a single new hire.
              </p>
              <p className="mt-4 text-[12px] text-[#444]">Yaniv &amp; Associates &middot; Legal</p>
            </div>

            {/* Stacked right — spans 2 cols */}
            <div className="md:col-span-2 flex flex-col gap-4">
              <div className="flex-1 rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] px-6 py-6">
                <p className="text-[clamp(2.5rem,5vw,3.5rem)] font-serif text-white leading-none">220%</p>
                <p className="mt-2 text-[15px] font-bold text-[#e5e0d8]">More qualified leads</p>
                <p className="mt-2 text-[13px] text-[#666] leading-relaxed">
                  7 people doing manual prospecting, replaced by one system running 24/7.
                </p>
                <p className="mt-3 text-[11px] text-[#444]">NeuronUP &middot; Healthcare SaaS</p>
              </div>
              <div className="flex-1 rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] px-6 py-6">
                <p className="text-[clamp(2.5rem,5vw,3.5rem)] font-serif text-white leading-none">82%</p>
                <p className="mt-2 text-[15px] font-bold text-[#e5e0d8]">Of calls handled by AI</p>
                <p className="mt-2 text-[13px] text-[#666] leading-relaxed">
                  Leads going cold after hours. AI voice agents now handle the volume. Consultations up 41%.
                </p>
                <p className="mt-3 text-[11px] text-[#444]">Vasquez Law Firm &middot; Legal Services</p>
              </div>
            </div>
          </div>

          {/* Full-width bottom card */}
          <div className="mt-4 rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] px-8 py-8 flex flex-col md:flex-row md:items-center gap-6">
            <p className="text-[clamp(2.5rem,5vw,3.5rem)] font-serif text-white leading-none shrink-0">90%</p>
            <div>
              <p className="text-[15px] font-bold text-[#e5e0d8]">Faster due diligence</p>
              <p className="mt-1 text-[13px] text-[#666] leading-relaxed">
                Europe&rsquo;s largest listed real estate company was spending half a day per vendor check. We built a system that does it in minutes. 6 companies evaluated simultaneously.
              </p>
              <p className="mt-2 text-[11px] text-[#444]">AroundTown &middot; Real Estate</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-28 px-6 text-center">
        <h2 className="text-[clamp(1.6rem,4vw,2.8rem)] font-serif text-[#f5f0eb] max-w-2xl mx-auto leading-snug">
          Find out what your number is.
        </h2>
        <Link
          href="/audit"
          className="mt-10 inline-block rounded-full bg-[#00D084] px-10 py-4 text-[16px] font-semibold text-[#0f0f0f] hover:bg-[#00e090] transition-colors"
        >
          Show Me the Numbers &nbsp;&rarr;
        </Link>
        <p className="mt-6 text-[12px] text-[#444]">
          Free &middot; No sales call &middot; Your data stays private
        </p>
      </section>
    </div>
  )
}
