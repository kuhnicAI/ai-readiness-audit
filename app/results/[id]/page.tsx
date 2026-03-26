'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import type { WasteCalculation } from '@/lib/waste'

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false })

const fmt = (n: number) => '£' + n.toLocaleString('en-GB')

function limitToTwoSentences(text: string): string {
  const sentences = text.split(/(?<=\.)\s+/).filter(s => s.trim().length > 0)
  return sentences.slice(0, 2).join(' ')
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/`/g, '')
}

function boldNumbers(text: string) {
  const parts = text.split(/(£[\d,.]+|[\d,.]+%|[\d,.]+\s+(?:people|hours?|calls?|per week|inbound|per hour|weeks?))/g)
  return parts.map((part, i) =>
    /^£|^\d.*%$|^\d/.test(part)
      ? <strong key={i} className="font-bold">{part}</strong>
      : <span key={i}>{part}</span>
  )
}

interface AuditData {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  role: string
  answers: Record<string, string | string[]>
  scores: WasteCalculation
  total_waste: number
  created_at: string
  ai_report?: string
}

interface ParsedFix {
  name: string
  impact: string
  now: string
  after: string
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const triggered = useRef(false)

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true
    const duration = 2000
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  return <>{display.toLocaleString('en-GB')}</>
}

function parseFixes(report: string): ParsedFix[] {
  // Try JSON format first (new structured output)
  const cleaned = report.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed.fix1Name) {
      return [
        { name: parsed.fix1Name, impact: parsed.fix1Impact ?? '', now: parsed.fix1RightNow ?? '', after: parsed.fix1AfterFix ?? '' },
        { name: parsed.fix2Name, impact: parsed.fix2Impact ?? '', now: parsed.fix2RightNow ?? '', after: parsed.fix2AfterFix ?? '' },
        { name: parsed.fix3Name, impact: parsed.fix3Impact ?? '', now: parsed.fix3RightNow ?? '', after: parsed.fix3AfterFix ?? '' },
      ].filter(f => f.name)
    }
  } catch { /* not JSON, try legacy parsing */ }

  // Legacy text format fallback
  const clean = stripMarkdown(report)
  const fixes: ParsedFix[] = []
  const fixRegex = /Fix\s+(\d+):\s*(.+?)(?=\n)/g
  let match

  while ((match = fixRegex.exec(clean)) !== null) {
    const startIdx = match.index
    const nextFixIdx = clean.indexOf('\nFix ', startIdx + 1)
    const sectionEndIdx = clean.indexOf('\nSECTION', startIdx + 1)
    const endIdx = Math.min(
      nextFixIdx > -1 ? nextFixIdx : clean.length,
      sectionEndIdx > -1 ? sectionEndIdx : clean.length
    )
    const block = clean.slice(startIdx, endIdx)
    const impactMatch = block.match(/Estimated annual impact:\s*(.+?)(?:\n|$)/)
    const nowMatch = block.match(/Now:\s*([\s\S]*?)(?=After:|$)/)
    const afterMatch = block.match(/After:\s*([\s\S]*?)(?=\n\n|Fix \d|SECTION|$)/)
    const brokenMatch = block.match(/What is broken:\s*([\s\S]*?)(?=What fixing it looks like:|The fix:|After:|$)/)
    const oldFixMatch = block.match(/What fixing it looks like:\s*([\s\S]*?)(?=Why they cannot|$)/)

    fixes.push({
      name: match[2].trim(),
      impact: impactMatch?.[1]?.trim() ?? '',
      now: (nowMatch?.[1] ?? brokenMatch?.[1] ?? '').trim().split('\n').join(' '),
      after: (afterMatch?.[1] ?? oldFixMatch?.[1] ?? '').trim().split('\n').join(' '),
    })
  }

  return fixes
}

function AnalysingMessages() {
  const messages = [
    'Analysing your business...',
    'Comparing against industry benchmarks...',
    'Looking at your website...',
    'Identifying the highest-ROI fixes...',
    'Writing your personalised recommendations...',
  ]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx(prev => (prev + 1) % messages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [messages.length])

  return (
    <section className="relative z-10 py-24 px-6 max-w-4xl mx-auto">
      <div className="text-center py-20">
        <div className="inline-block w-8 h-8 border-[3px] border-[#eee] border-t-[#00D084] rounded-full animate-spin mb-6" />
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            className="text-[18px] text-[#999] font-serif"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {messages[idx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </section>
  )
}

function FixesSection({ fixes, companyName, loading }: { fixes: ParsedFix[]; companyName: string; loading: boolean }) {
  if (loading) {
    return <AnalysingMessages />
  }

  if (fixes.length === 0) return null

  return (
    <section className="relative z-10 py-24 px-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-serif text-[#1a1a2e] mb-4 text-center">
          The three highest-ROI fixes for {companyName}
        </h2>
        <p className="text-[17px] text-[#999] text-center mb-14">
          Most businesses we work with recover the cost of implementation within 60 days.
        </p>
      </motion.div>

      <div className="space-y-6">
        {fixes.map((fix, i) => (
          <motion.div
            key={i}
            className="rounded-2xl bg-white border border-[#eee] p-8 md:p-12 shadow-sm"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-5%' }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4 mb-8">
              <h3 className="text-[24px] font-bold text-[#1a1a2e] leading-snug">{fix.name}</h3>
              <span className="shrink-0 text-[16px] font-semibold text-[#00D084]">{fix.impact}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#d97706] mb-3">Right now</p>
                <p className="text-[18px] font-bold text-[#1a1a2e] leading-[1.6]">{limitToTwoSentences(fix.now)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#00D084] mb-3">After the fix</p>
                <p className="text-[18px] font-bold text-[#1a1a2e] leading-[1.6]">{limitToTwoSentences(fix.after)}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

const TESTIMONIALS_BY_TYPE: Record<string, { quote: string; name: string; title: string } | null> = {
  'We sell services to clients (agency, consultancy, professional services)': {
    quote: 'Prospecting used to feel like finding a needle in a haystack. Now the haystack sorts itself, and our SDRs only touch gold.',
    name: 'Fernando Bozalongo Yag\u00FCe',
    title: 'Chief of Growth, NeuronUP',
  },
  'We run a practice or clinic (legal, medical, financial)': {
    quote: 'We had no idea how much we were losing to missed calls until we saw the number. Within three months, 82% of our inbound calls were being handled automatically. Qualified consultations went up 41%.',
    name: 'Kevin Kim',
    title: 'Technical Lead, Vasquez Law Firm',
  },
  'We operate a location-based business (venue, retail, hospitality)': {
    quote: 'The system runs quietly in the background and removes almost all manual work from client intake. Our team focuses on the work that matters, not admin.',
    name: 'Daniel Yaniv, Esq.',
    title: 'Founder, Yaniv & Associates',
  },
  "We're a tech company or SaaS": {
    quote: 'Before this, we were pulling credit reports, searching SAP, googling companies one by one. Now the system hands us a report in minutes.',
    name: 'Kristina Brahmstaedt',
    title: 'AI Support Team Lead, AroundTown',
  },
}

function TestimonialSection({ businessType }: { businessType: string }) {
  const testimonial = TESTIMONIALS_BY_TYPE[businessType]
  if (!testimonial) return null

  return (
    <section className="relative z-10 py-24 px-6 max-w-4xl mx-auto">
      <motion.div
        className="rounded-2xl bg-[#f5f5f5] border border-[#e5e5e5] p-10 md:p-14 text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-[20px] text-[#1a1a2e] leading-[1.8] max-w-2xl mx-auto">
          {testimonial.quote}
        </p>
        <p className="mt-10 text-[14px] text-[#999]">
          {testimonial.name}, {testimonial.title}
        </p>
      </motion.div>
    </section>
  )
}

function formatCompanyName(raw: string): string {
  let name = raw.trim()
  // Strip protocol
  name = name.replace(/^https?:\/\//, '')
  // Strip www.
  name = name.replace(/^www\./, '')
  // Strip trailing slash
  name = name.replace(/\/+$/, '')
  // If it looks like a domain, extract the name part
  if (name.includes('.')) {
    // e.g. "kuhnic.ai" → "Kuhnic", "mycompany.co.uk" → "Mycompany"
    const parts = name.split('.')
    name = parts[0]
  }
  // Capitalise first letter
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1)
  }
  return name
}

function fmtBenchmark(n: number): string {
  if (n >= 1000000) {
    const m = n / 1000000
    return '£' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'M'
  }
  return '£' + n.toLocaleString('en-GB')
}

const BENCHMARKS: Record<string, Record<string, [number, number]>> = {
  'We sell services to clients (agency, consultancy, professional services)': {
    '1 to 10': [8000, 30000], '11 to 50': [40000, 150000], '51 to 200': [150000, 550000],
    '201 to 500': [400000, 1400000], '500+': [1000000, 3500000],
  },
  'We run a practice or clinic (legal, medical, financial)': {
    '1 to 10': [10000, 35000], '11 to 50': [50000, 180000], '51 to 200': [180000, 650000],
    '201 to 500': [500000, 1600000], '500+': [1200000, 4000000],
  },
  'We operate a location-based business (venue, retail, hospitality)': {
    '1 to 10': [8000, 25000], '11 to 50': [35000, 120000], '51 to 200': [120000, 400000],
    '201 to 500': [300000, 1000000], '500+': [800000, 2500000],
  },
  "We're a tech company or SaaS": {
    '1 to 10': [12000, 40000], '11 to 50': [60000, 200000], '51 to 200': [200000, 750000],
    '201 to 500': [500000, 1800000], '500+': [1500000, 4500000],
  },
}

const DEFAULT_BENCHMARKS: Record<string, [number, number]> = {
  '1 to 10': [8000, 30000], '11 to 50': [40000, 150000], '51 to 200': [150000, 500000],
  '201 to 500': [400000, 1200000], '500+': [1000000, 3000000],
}

const TYPE_LABELS: Record<string, string> = {
  'We sell services to clients (agency, consultancy, professional services)': 'professional services firm',
  'We run a practice or clinic (legal, medical, financial)': 'practice',
  'We operate a location-based business (venue, retail, hospitality)': 'location-based business',
  "We're a tech company or SaaS": 'tech company',
  'Something else': 'business',
}

const SIZE_LABELS: Record<string, string> = {
  '1 to 10': '1 to 10 people',
  '11 to 50': '11 to 50 people',
  '51 to 200': '51 to 200 people',
  '201 to 500': '201 to 500 people',
  '500+': '500 or more people',
}

function PdfDownloadSection({ audit, waste, report, displayName }: { audit: AuditData; waste: WasteCalculation; report: string; displayName: string }) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const handleDownload = async () => {
    setPdfLoading(true)
    setPdfError('')
    try {
      const res = await fetch('/api/audit/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: audit.company_name,
          contactName: audit.contact_name,
          role: audit.role ?? '',
          waste,
          reportRaw: report,
          businessType: audit.answers?.business_type ?? '',
          employeeCount: audit.answers?.employee_count ?? '',
          date: new Date(audit.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? `Server returned ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `AI-Audit-${displayName}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download failed:', err)
      setPdfError(err instanceof Error ? err.message : 'Failed to generate PDF. Please try again.')
    }
    setPdfLoading(false)
  }

  return (
    <section className="relative z-10 py-16 px-6 text-center">
      <button
        onClick={handleDownload}
        disabled={pdfLoading}
        className="rounded-full bg-[#1a1a2e] px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-[#2a2a3e] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
      >
        {pdfLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating PDF...
          </span>
        ) : 'Download Your Full Report (PDF)'}
      </button>
      {pdfError && <p className="mt-3 text-[13px] text-red-500">{pdfError}</p>}
      <p className="mt-4 text-[13px] text-[#999]">We&rsquo;ve also sent a summary to {audit.contact_email}</p>
    </section>
  )
}

function benchmarkLine(businessType: string, companySize: string): string {
  const typeLabel = TYPE_LABELS[businessType] ?? 'business'
  const sizeLabel = SIZE_LABELS[companySize] ?? companySize + ' people'
  const typeBenchmarks = BENCHMARKS[businessType] ?? DEFAULT_BENCHMARKS
  const [low, high] = typeBenchmarks[companySize] ?? DEFAULT_BENCHMARKS[companySize] ?? [15000, 60000]
  return `The average ${typeLabel} with ${sizeLabel} loses ${fmtBenchmark(low)} to ${fmtBenchmark(high)} annually to these same inefficiencies.`
}

const calendarUrl = process.env.NEXT_PUBLIC_CALENDAR_URL ?? 'https://calendly.com/transputec-ai/consultation'

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const [audit, setAudit] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const fetchedRef = useRef(false)
  const reportFetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetch(`/api/audit/${id}`)
      .then(r => r.json())
      .then(d => { if (d.audit) setAudit(d.audit); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!audit || reportFetchedRef.current) return
    reportFetchedRef.current = true
    if (audit.ai_report) { setReport(audit.ai_report); return }
    setReportLoading(true)
    fetch('/api/audit/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audit_id: audit.id, answers: audit.answers, waste: audit.scores,
        companyName: audit.company_name, contactName: audit.contact_name, contactEmail: audit.contact_email, role: audit.role ?? 'Not specified',
      }),
    })
      .then(r => r.json())
      .then(d => { if (d.report) setReport(d.report) })
      .catch(() => {})
      .finally(() => setReportLoading(false))
  }, [audit])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[15px] text-[#999]">Calculating your results...</div>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#1a1a2e]">Audit not found</h1>
          <p className="mt-2 text-[14px] text-[#999]">This link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  const w = audit.scores
  const fixes = report ? parseFixes(report) : []
  const displayName = formatCompanyName(audit.company_name)
  const weeklyLoss = Math.round(w.totalWaste / 52 / 100) * 100

  return (
    <div className="relative min-h-screen bg-white text-[#1a1a2e]">
      {/* ═══ COLORBENDS BG ═══ */}
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

      {/* ═══ LOGOS ═══ */}
      <div className="relative z-10 px-6 md:px-16 pt-8">
        <a href="https://kuhnic.ai" target="_blank" rel="noopener noreferrer">
          <Image src="/kuhnic-logo.svg" alt="Kuhnic" width={100} height={26} className="h-[22px] w-auto" />
        </a>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[9px] text-[#aaa]">powered by</span>
          <a href="https://transputec.com" target="_blank" rel="noopener noreferrer">
            <Image src="/transputec-logo.svg" alt="Transputec" width={60} height={8} className="h-[7px] w-auto" />
          </a>
        </div>
      </div>

      {/* ═══ SECTION 1: THE NUMBER ═══ */}
      <section className="relative z-10 pt-16 pb-24 px-6 text-center">
        <motion.p
          className="text-[20px] text-[#999]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Based on your answers, here is what inefficiency is costing {displayName} each year.
        </motion.p>

        <motion.p
          className="mt-8 text-[clamp(4rem,10vw,7rem)] font-serif text-[#1a1a2e] leading-none"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          £<AnimatedNumber value={w.totalWaste} />
        </motion.p>

        <motion.p
          className="mt-4 text-[17px] font-semibold text-[#d97706]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          That&rsquo;s approximately {fmt(weeklyLoss)} every week you wait.
        </motion.p>

        <motion.div
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div className="text-center">
            <p className="text-[clamp(1.8rem,4vw,2.8rem)] font-serif text-[#00D084]">{fmt(w.revenueAtRisk)}</p>
            <p className="mt-2 text-[17px] text-[#999]">Revenue at risk from missed calls and enquiries</p>
          </div>
          <div className="text-center">
            <p className="text-[clamp(1.8rem,4vw,2.8rem)] font-serif text-[#00D084]">{fmt(w.adminCost)}</p>
            <p className="mt-2 text-[17px] text-[#999]">Cost of manual processes and admin</p>
          </div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="relative z-10 max-w-5xl mx-auto px-6"><div className="h-[1px] bg-[#eee]" /></div>

      {/* ═══ SECTION 2: WHY THIS NUMBER IS REAL ═══ */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.p
            className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[#bbb] mb-10 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            How we calculated this
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Missed revenue */}
            <motion.div
              className="rounded-2xl bg-white border border-[#eee] p-7 shadow-sm"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[20px] font-bold text-[#1a1a2e] mb-3">Missed revenue</p>
              <p className="text-[clamp(1.4rem,3vw,2rem)] font-serif text-[#00D084] mb-4">{fmt(w.revenueAtRisk)}<span className="text-[14px] text-[#ccc] font-sans">/yr</span></p>
              <p className="text-[15px] text-[#666] leading-[1.7]">
                {boldNumbers(`${w.weeklyInbound} calls/week. ${Math.round(w.missedRate * 100)}% missed. At ${fmt(w.clientValue)} per client and ${Math.round(w.conversionRate * 100)}% conversion.`)}
              </p>
            </motion.div>

            {/* Manual admin */}
            <motion.div
              className="rounded-2xl bg-white border border-[#eee] p-7 shadow-sm"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <p className="text-[20px] font-bold text-[#1a1a2e] mb-3">Manual admin</p>
              <p className="text-[clamp(1.4rem,3vw,2rem)] font-serif text-[#00D084] mb-4">{fmt(w.adminCost)}<span className="text-[14px] text-[#ccc] font-sans">/yr</span></p>
              <p className="text-[15px] text-[#666] leading-[1.7]">
                {boldNumbers(`${w.adminHeadcount} people. ${w.weeklyAdminHours} hours/week each. £${w.hourlyRate.toFixed(0)}/hr across 52 weeks.`)}
              </p>
            </motion.div>

            {/* Total */}
            <motion.div
              className="rounded-2xl bg-white border border-[#eee] p-7 shadow-sm"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="text-[20px] font-bold text-[#1a1a2e] mb-3">Total waste</p>
              <p className="text-[clamp(1.4rem,3vw,2rem)] font-serif text-[#00D084] mb-4">{fmt(w.totalWaste)}<span className="text-[14px] text-[#ccc] font-sans">/yr</span></p>
              <p className="text-[15px] text-[#666] leading-[1.7]">
                {fmt(w.revenueAtRisk)} + {fmt(w.adminCost)} = <strong className="font-bold text-[#1a1a2e]">{fmt(w.totalWaste)}</strong>. Lower bound of every range.
              </p>
            </motion.div>
          </div>

          <p className="mt-8 text-[15px] text-[#999] text-center">
            {benchmarkLine(audit.answers?.business_type as string, audit.answers?.employee_count as string)}
          </p>
        </div>
      </section>

      {/* ═══ SECTION 3: THE THREE FIXES ═══ */}
      <FixesSection fixes={fixes} companyName={displayName} loading={reportLoading} />

      {/* ═══ DOWNLOAD + EMAIL NOTE ═══ */}
      {report && !reportLoading && (
        <PdfDownloadSection audit={audit} waste={w} report={report} displayName={displayName} />
      )}

      {/* ═══ SECTION 5: CTA ═══ */}
      <section className="relative z-10 py-28 px-6 bg-[#f5f5f5]/80 backdrop-blur-sm border-t border-[#e5e5e5]">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-serif text-[#1a1a2e]">
            Ready to eliminate this waste?
          </h2>
          <p className="mt-5 text-[16px] text-[#999] max-w-xl mx-auto leading-relaxed">
            We&rsquo;ll walk you through exactly how these numbers were calculated and what fixing them
            would look like for your business specifically. No pitch. Just the findings.
          </p>
          <a
            href="https://calendly.com/jorge-linklemon/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-block rounded-full bg-[#00D084] px-10 py-4 text-[16px] font-semibold text-white hover:bg-[#00b873] transition-colors shadow-lg shadow-[#00D084]/20"
          >
            Book a Free Consultation
          </a>
          <p className="mt-4 text-[14px] text-[#999]">
            15 minutes. We look at your specific numbers together. No proposal unless you ask for one.
          </p>
          <a
            href="https://www.linkedin.com/company/kuhnicai"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-block text-[#bbb] hover:text-[#0A66C2] transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </motion.div>
      </section>

    </div>
  )
}
