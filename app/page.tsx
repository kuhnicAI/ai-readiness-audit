'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false })
const SplitText = dynamic(() => import('@/components/SplitText'), { ssr: false })

function Counter({ end, suffix = '', prefix = '', delay = 0 }: { end: number; suffix?: string; prefix?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const triggered = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !triggered.current) {
        triggered.current = true
        setTimeout(() => {
          const duration = 1500
          const start = performance.now()
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(Math.round(eased * end))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }, delay)
      }
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [end, delay])

  return <span ref={ref}>{prefix}{value}{suffix}</span>
}

function RevealLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' })

  return (
    <div ref={ref} className="overflow-hidden">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  )
}

import { AnimatedTestimonials } from '@/components/ui/animated-testimonials'

const TESTIMONIALS = [
  {
    quote: 'The AI voice agent picks up every call, qualifies the caller, and books them straight into our calendar. Our team now focuses on legal work, not answering phones.',
    name: 'Daniel Yaniv, Esq.',
    designation: 'Founder, Yaniv & Associates',
    src: '/testimonials/daniel-yaniv.jpg',
  },
  {
    quote: 'The AI agent performed exactly how our team would qualify applicants, but faster, more consistent, and always available. After the pilot success, we\'re now expanding this across more than 40 university programs.',
    name: 'Pagan',
    designation: 'Director of Enrollment',
    src: '/testimonials/pagan.jpg',
  },
  {
    quote: 'The AI agent is able to manage the full booking flow end-to-end, from finding the right park to taking the deposit. It feels natural, fast, and reliable, and it works at the same quality every single time.',
    name: 'Operations Lead',
    designation: 'Operations, Trampoline Park Company',
    src: '/testimonials/trampoline-logo.png',
  },
  {
    quote: 'The system runs continuously and routes every call correctly. Data is complete, bookings are accurate, and our staff only touches high-value cases.',
    name: 'Kevin Kim',
    designation: 'Technical Lead, Vasquez Law Firm',
    src: '/testimonials/kevin-kim.jpg',
  },
  {
    quote: 'The AI handles every call the same way, professionally, instantly, and without missed details. Our team now focuses on the jobs that actually need human attention.',
    name: 'Lucy Burton',
    designation: 'Owner, Excel Security',
    src: '/testimonials/lucy-burton.jpg',
  },
  {
    quote: 'The AI handles first-line triage so our staff can focus on complex client needs. We\'re targeting a 50% reduction in frontline team size while handling the same call volume.',
    name: 'Eric Farber',
    designation: 'Owner, Pacific Workers',
    src: '/testimonials/eric-farber.jpg',
  },
]

export default function HomePage() {
  const router = useRouter()
  const [transitioning, setTransitioning] = useState(false)

  const handleStartAudit = useCallback(() => {
    setTransitioning(true)
    setTimeout(() => router.push('/audit'), 2000)
  }, [router])

  return (
    <div className="relative min-h-screen bg-white text-[#1a1a2e]">
      {/* ═══ PAGE TRANSITION ═══ */}
      <AnimatePresence>
        {transitioning && (
          <>
            {/* Green circle expands from center */}
            <motion.div
              className="fixed inset-0 z-[200] flex items-center justify-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-[#00D084] rounded-full"
                initial={{ width: 0, height: 0, opacity: 0.6 }}
                animate={{ width: '300vmax', height: '300vmax', opacity: 1 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </motion.div>
            {/* Text fades in on top */}
            <motion.div
              className="fixed inset-0 z-[201] flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              <SplitText
                text="Let's find your number."
                className="text-[clamp(2.5rem,6vw,4.5rem)] font-serif text-white text-center"
                delay={40}
                duration={0.8}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 30 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0}
                rootMargin="0px"
                textAlign="center"
                onLetterAnimationComplete={() => {}}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* ═══ FULL PAGE COLORBENDS BG ═══ */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-10">
        <ColorBends
          className=""
          rotation={45}
          speed={0.2}
          colors={['#00d084', '#04ace0']}
          transparent
          autoRotate={0}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={1}
          parallax={0.5}
          noise={0.1}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative z-10 min-h-screen flex flex-col justify-between px-6 md:px-16 max-w-7xl mx-auto">
        <motion.div
          className="pt-10 md:pt-14 flex flex-col items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <a href="https://kuhnic.ai" target="_blank" rel="noopener noreferrer">
            <Image src="/kuhnic-logo.svg" alt="Kuhnic" width={120} height={32} className="h-[28px] w-auto" />
          </a>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] text-[#aaa]">powered by</span>
            <a href="https://transputec.com" target="_blank" rel="noopener noreferrer">
              <Image src="/transputec-logo.svg" alt="Transputec" width={70} height={9} className="h-[8px] w-auto" />
            </a>
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col justify-center items-center text-center py-12">
          <motion.h1
            className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.08] font-serif text-[#1a1a2e] max-w-5xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Every missed call is money<br />
            <em className="text-[#00D084] italic">you&rsquo;ll never see.</em>
          </motion.h1>

          <motion.p
            className="mt-6 text-[clamp(1rem,2vw,1.25rem)] text-[#666] max-w-3xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            60 seconds. See exactly how much it&rsquo;s costing you every year.
          </motion.p>

          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              onClick={handleStartAudit}
              className="rounded-full bg-[#00D084] px-8 py-4 text-[15px] font-semibold text-white hover:bg-[#00b873] transition-colors shadow-lg shadow-[#00D084]/20"
            >
              Calculate My Lost Revenue Now &nbsp;&rarr;
            </button>
          </motion.div>
        </div>

        <motion.div
          className="pb-10 md:pb-14 grid grid-cols-3 border-t border-[#eee] pt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <div>
            <p className="text-[clamp(2rem,4vw,3.2rem)] font-serif text-[#1a1a2e]">
              <Counter end={50} delay={1000} />
            </p>
            <p className="mt-1 text-[11px] text-[#999] uppercase tracking-wider">Audits completed</p>
          </div>
          <div>
            <p className="text-[clamp(2rem,4vw,3.2rem)] font-serif text-[#1a1a2e]">
              £<Counter end={3} suffix=".75M" delay={1000} />
            </p>
            <p className="mt-1 text-[11px] text-[#999] uppercase tracking-wider">Saved for clients</p>
          </div>
          <div>
            <p className="text-[clamp(2rem,4vw,3.2rem)] font-serif text-[#1a1a2e]">
              <Counter end={60} suffix="s" delay={1000} />
            </p>
            <p className="mt-1 text-[11px] text-[#999] uppercase tracking-wider">To complete</p>
          </div>
        </motion.div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="relative z-10">
        <AnimatedTestimonials testimonials={TESTIMONIALS} autoplay />
      </section>

      {/* ═══ WHAT YOU GET ═══ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-16 py-32 text-center">
        <RevealLine>
          <p className="text-[clamp(2rem,5vw,3.5rem)] font-serif text-[#ccc] leading-[1.15] mb-12">What you get</p>
        </RevealLine>

        <div className="space-y-6">
          <RevealLine delay={0}>
            <p className="text-[clamp(2rem,5vw,3.5rem)] font-serif text-[#1a1a2e] leading-[1.15]">
              Your exact missed revenue number.
            </p>
          </RevealLine>
          <RevealLine delay={0.15}>
            <p className="text-[clamp(2rem,5vw,3.5rem)] font-serif text-[#1a1a2e] leading-[1.15]">
              What an AI voice agent would recover.
            </p>
          </RevealLine>
          <RevealLine delay={0.3}>
            <p className="text-[clamp(2rem,5vw,3.5rem)] font-serif text-[#1a1a2e] leading-[1.15]">
              A cost comparison against your current setup.
            </p>
          </RevealLine>
        </div>
      </section>

      {/* ═══ CLIENT LOGOS ═══ */}
      <section className="relative z-10">
        <div className="max-w-[90rem] mx-auto px-6 md:px-16 py-24 text-center">
          <RevealLine>
            <p className="text-[clamp(2rem,5vw,3.5rem)] font-serif text-[#ccc] leading-[1.15] mb-14">
              Companies we&rsquo;ve audited
            </p>
          </RevealLine>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-5%' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {['/logos-row-1.svg', '/logos-row-2.svg', '/logos-row-3.svg', '/logos-row-4.svg'].map((src) => (
              <Image key={src} src={src} alt="Client logos" width={978} height={82} className="w-full h-auto invert opacity-70" />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative z-10 py-32 px-6 text-center">
        <RevealLine>
          <h2 className="text-[clamp(1.6rem,4vw,2.8rem)] font-serif text-[#1a1a2e] max-w-2xl mx-auto leading-snug">
            Find out what your number is.
          </h2>
        </RevealLine>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <button
            onClick={handleStartAudit}
            className="mt-10 inline-block rounded-full bg-[#00D084] px-10 py-4 text-[16px] font-semibold text-white hover:bg-[#00b873] transition-colors shadow-lg shadow-[#00D084]/20"
          >
            Calculate My Lost Revenue Now &nbsp;&rarr;
          </button>
          <p className="mt-6 text-[12px] text-[#aaa]">
            Free &middot; No sales call &middot; Your data stays private
          </p>
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 pb-10 px-6 flex justify-center">
        <a
          href="https://www.linkedin.com/company/kuhnicai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#bbb] hover:text-[#0A66C2] transition-colors"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </a>
      </footer>
    </div>
  )
}
